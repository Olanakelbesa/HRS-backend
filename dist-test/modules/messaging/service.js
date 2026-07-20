"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listConversations = listConversations;
exports.createConversation = createConversation;
exports.listMessages = listMessages;
exports.sendMessage = sendMessage;
exports.markConversationAsRead = markConversationAsRead;
exports.getConversationMetadata = getConversationMetadata;
exports.deleteConversation = deleteConversation;
exports.updateMessageStatus = updateMessageStatus;
exports.sendAttachment = sendAttachment;
exports.addReaction = addReaction;
exports.removeReaction = removeReaction;
exports.assertParticipant = assertParticipant;
exports.deleteMessage = deleteMessage;
const database_1 = __importDefault(require("../../config/database"));
const AppError_1 = require("../../core/AppError");
const service_1 = require("../notifications/service");
const ALLOWED_ATTACHMENT_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
];
function getMessageTypeByMime(mimeType) {
    if (mimeType.startsWith('image/'))
        return 'IMAGE';
    if (mimeType.startsWith('video/'))
        return 'VIDEO';
    if (mimeType.startsWith('audio/'))
        return 'AUDIO';
    return 'FILE';
}
const messageSelect = {
    id: true,
    conversationId: true,
    senderId: true,
    type: true,
    content: true,
    status: true,
    createdAt: true,
    replyTo: {
        select: {
            id: true,
            senderId: true,
            type: true,
            content: true,
            createdAt: true,
            attachments: {
                select: {
                    id: true,
                    url: true,
                    fileName: true,
                    mimeType: true,
                    fileSize: true,
                },
            },
        },
    },
    attachments: {
        select: {
            id: true,
            url: true,
            fileName: true,
            mimeType: true,
            fileSize: true,
            createdAt: true,
        },
    },
    reactions: {
        select: {
            id: true,
            emoji: true,
            userId: true,
            createdAt: true,
        },
    },
};
function ensureParticipant(conversationId, userId) {
    return database_1.default.conversation.findFirst({
        where: {
            id: conversationId,
            deletedAt: null,
            OR: [{ renterId: userId }, { ownerId: userId }],
        },
    });
}
async function validateReplyTarget(replyToId, conversationId) {
    if (!replyToId)
        return;
    const replyTarget = await database_1.default.message.findUnique({
        where: { id: replyToId },
        select: { id: true, conversationId: true },
    });
    if (!replyTarget) {
        throw new AppError_1.AppError('Reply target message not found', 404);
    }
    if (replyTarget.conversationId !== conversationId) {
        throw new AppError_1.AppError('Reply target must belong to the same conversation', 400);
    }
}
async function listConversations(userId) {
    const conversations = await database_1.default.conversation.findMany({
        where: {
            deletedAt: null,
            OR: [{ renterId: userId }, { ownerId: userId }],
        },
        orderBy: { updatedAt: 'desc' },
        include: {
            property: {
                select: {
                    id: true,
                    title: true,
                    location: true,
                    images: true,
                },
            },
            renter: { select: { id: true, first_name: true, last_name: true, email: true, image: true } },
            owner: { select: { id: true, first_name: true, last_name: true, email: true, image: true } },
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: messageSelect,
            },
        },
    });
    // Calculate unread counts
    return Promise.all(conversations.map(async (conv) => {
        const unreadCount = await database_1.default.message.count({
            where: {
                conversationId: conv.id,
                senderId: { not: userId },
                status: { not: 'READ' },
            },
        });
        // Determine who the "other" person is
        const participant = conv.renterId === userId ? conv.owner : conv.renter;
        return {
            ...conv,
            participant,
            lastMessage: conv.messages[0] || null,
            unreadCount,
        };
    }));
}
async function createConversation(userId, input) {
    const { ownerId, renterId, propertyId } = input;
    if (ownerId === renterId) {
        throw new AppError_1.AppError('Owner and renter must be different users', 400);
    }
    if (userId !== ownerId && userId !== renterId) {
        throw new AppError_1.AppError('You can only create conversations for yourself', 403);
    }
    if (propertyId) {
        const property = await database_1.default.property.findUnique({
            where: { id: propertyId },
            select: { ownerId: true },
        });
        if (!property) {
            throw new AppError_1.AppError('Property not found', 404);
        }
        if (property.ownerId !== ownerId) {
            throw new AppError_1.AppError('Owner does not match property owner', 400);
        }
    }
    const existing = await database_1.default.conversation.findFirst({
        where: {
            ownerId,
            renterId,
            propertyId: propertyId ?? null,
            deletedAt: null,
        },
    });
    if (existing)
        return existing;
    return database_1.default.conversation.create({
        data: {
            ownerId,
            renterId,
            propertyId: propertyId ?? null,
        },
        include: {
            property: { select: { id: true, title: true, location: true } },
            renter: { select: { id: true, first_name: true, last_name: true, email: true, image: true } },
            owner: { select: { id: true, first_name: true, last_name: true, email: true, image: true } },
        },
    });
}
async function listMessages(conversationId, userId, query) {
    const conversation = await ensureParticipant(conversationId, userId);
    if (!conversation)
        throw new AppError_1.AppError('Conversation not found', 404);
    const limit = query.limit ?? 30;
    const messages = await database_1.default.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: messageSelect,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    return {
        messages: messages.slice().reverse(),
        nextCursor: messages.length === limit ? messages[messages.length - 1].id : null,
    };
}
async function sendMessage(conversationId, senderId, input) {
    const conversation = await ensureParticipant(conversationId, senderId);
    if (!conversation)
        throw new AppError_1.AppError('Conversation not found', 404);
    await validateReplyTarget(input.replyToId, conversationId);
    const [message] = await database_1.default.$transaction([
        database_1.default.message.create({
            data: {
                conversationId,
                senderId,
                type: 'TEXT',
                content: input.content,
                replyToId: input.replyToId ?? null,
            },
            select: messageSelect,
        }),
        database_1.default.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        }),
    ]);
    const recipientId = conversation.renterId === senderId ? conversation.ownerId : conversation.renterId;
    await (0, service_1.createNotification)({
        userId: recipientId,
        type: 'MESSAGE_NEW',
        title: 'New message',
        body: input.content.slice(0, 120),
        payload: { conversationId, messageId: message.id },
    });
    await (0, service_1.createAuditLog)({
        actorId: senderId,
        eventType: 'MESSAGE_SENT',
        entityType: 'Message',
        entityId: message.id,
        metadata: { conversationId, type: 'TEXT' },
    });
    return { message, conversation };
}
async function markConversationAsRead(conversationId, userId) {
    const conversation = await ensureParticipant(conversationId, userId);
    if (!conversation)
        throw new AppError_1.AppError('Conversation not found', 404);
    await database_1.default.message.updateMany({
        where: {
            conversationId,
            senderId: { not: userId },
            status: { not: 'READ' },
        },
        data: { status: 'READ' },
    });
    return { success: true };
}
async function getConversationMetadata(conversationId, userId) {
    const conversation = await database_1.default.conversation.findFirst({
        where: { id: conversationId, deletedAt: null },
        include: {
            property: {
                select: {
                    id: true,
                    title: true,
                    location: true,
                    images: true,
                },
            },
            renter: { select: { id: true, first_name: true, last_name: true, email: true, image: true } },
            owner: { select: { id: true, first_name: true, last_name: true, email: true, image: true } },
        },
    });
    if (!conversation)
        throw new AppError_1.AppError('Conversation not found', 404);
    const isParticipant = conversation.renterId === userId || conversation.ownerId === userId;
    if (!isParticipant)
        throw new AppError_1.AppError('Access denied', 403);
    const participant = conversation.renterId === userId ? conversation.owner : conversation.renter;
    return {
        ...conversation,
        participant,
    };
}
async function deleteConversation(conversationId, userId) {
    const conversation = await ensureParticipant(conversationId, userId);
    if (!conversation)
        throw new AppError_1.AppError('Conversation not found', 404);
    await database_1.default.conversation.update({
        where: { id: conversationId },
        data: { deletedAt: new Date() },
    });
    await (0, service_1.createAuditLog)({
        actorId: userId,
        eventType: 'CONVERSATION_DELETED',
        entityType: 'Conversation',
        entityId: conversationId,
        metadata: {
            renterId: conversation.renterId,
            ownerId: conversation.ownerId,
            propertyId: conversation.propertyId,
        },
    });
    return { conversationId };
}
async function updateMessageStatus(messageId, userId, input) {
    const message = await database_1.default.message.findFirst({
        where: {
            id: messageId,
            conversation: {
                OR: [{ renterId: userId }, { ownerId: userId }],
            },
        },
        include: { conversation: true },
    });
    if (!message)
        throw new AppError_1.AppError('Message not found', 404);
    if (message.senderId === userId)
        throw new AppError_1.AppError('Cannot update status for your own message', 400);
    const updated = await database_1.default.message.update({
        where: { id: messageId },
        data: { status: input.status },
        select: messageSelect,
    });
    await (0, service_1.createAuditLog)({
        actorId: userId,
        eventType: 'MESSAGE_STATUS_UPDATED',
        entityType: 'Message',
        entityId: updated.id,
        metadata: { status: input.status, conversationId: updated.conversationId },
    });
    return { message: updated, conversation: message.conversation };
}
async function sendAttachment(conversationId, senderId, file, input) {
    const conversation = await ensureParticipant(conversationId, senderId);
    if (!conversation)
        throw new AppError_1.AppError('Conversation not found', 404);
    await validateReplyTarget(input.replyToId, conversationId);
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.mimetype)) {
        throw new AppError_1.AppError('Unsupported file type', 400);
    }
    const messageType = getMessageTypeByMime(file.mimetype);
    const publicUrl = `/uploads/${file.filename}`;
    const [message] = await database_1.default.$transaction([
        database_1.default.message.create({
            data: {
                conversationId,
                senderId,
                type: messageType,
                content: input.caption ?? '',
                replyToId: input.replyToId ?? null,
                attachments: {
                    create: {
                        url: publicUrl,
                        fileName: file.originalname,
                        mimeType: file.mimetype,
                        fileSize: file.size,
                    },
                },
            },
            select: messageSelect,
        }),
        database_1.default.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        }),
    ]);
    const recipientId = conversation.renterId === senderId ? conversation.ownerId : conversation.renterId;
    await (0, service_1.createNotification)({
        userId: recipientId,
        type: 'MESSAGE_NEW',
        title: 'New attachment',
        body: file.originalname,
        payload: {
            conversationId,
            messageId: message.id,
            attachmentType: messageType,
        },
    });
    await (0, service_1.createAuditLog)({
        actorId: senderId,
        eventType: 'MESSAGE_ATTACHMENT_SENT',
        entityType: 'Message',
        entityId: message.id,
        metadata: {
            conversationId,
            mimeType: file.mimetype,
            fileSize: file.size,
            messageType,
        },
    });
    return { message, conversation };
}
async function addReaction(messageId, userId, input) {
    const message = await database_1.default.message.findFirst({
        where: {
            id: messageId,
            conversation: {
                OR: [{ renterId: userId }, { ownerId: userId }],
            },
        },
    });
    if (!message)
        throw new AppError_1.AppError('Message not found', 404);
    await database_1.default.messageReaction.upsert({
        where: {
            messageId_userId_emoji: {
                messageId,
                userId,
                emoji: input.emoji,
            },
        },
        update: {},
        create: {
            messageId,
            userId,
            emoji: input.emoji,
        },
    });
    const updatedMessage = await database_1.default.message.findUnique({
        where: { id: messageId },
        select: messageSelect,
    });
    await (0, service_1.createAuditLog)({
        actorId: userId,
        eventType: 'MESSAGE_REACTION_ADDED',
        entityType: 'Message',
        entityId: messageId,
        metadata: { emoji: input.emoji },
    });
    return updatedMessage;
}
async function removeReaction(messageId, userId, input) {
    const message = await database_1.default.message.findFirst({
        where: {
            id: messageId,
            conversation: {
                OR: [{ renterId: userId }, { ownerId: userId }],
            },
        },
    });
    if (!message)
        throw new AppError_1.AppError('Message not found', 404);
    await database_1.default.messageReaction.deleteMany({
        where: {
            messageId,
            userId,
            emoji: input.emoji,
        },
    });
    const updatedMessage = await database_1.default.message.findUnique({
        where: { id: messageId },
        select: messageSelect,
    });
    await (0, service_1.createAuditLog)({
        actorId: userId,
        eventType: 'MESSAGE_REACTION_REMOVED',
        entityType: 'Message',
        entityId: messageId,
        metadata: { emoji: input.emoji },
    });
    return updatedMessage;
}
async function assertParticipant(conversationId, userId) {
    const conversation = await ensureParticipant(conversationId, userId);
    if (!conversation)
        throw new AppError_1.AppError('Conversation not found', 404);
    return conversation;
}
async function deleteMessage(messageId, userId) {
    const message = await database_1.default.message.findFirst({
        where: {
            id: messageId,
            conversation: {
                OR: [{ renterId: userId }, { ownerId: userId }],
            },
        },
        include: { conversation: true },
    });
    if (!message)
        throw new AppError_1.AppError('Message not found', 404);
    if (message.senderId !== userId) {
        throw new AppError_1.AppError('You can only delete your own message', 403);
    }
    await database_1.default.$transaction([
        database_1.default.message.delete({ where: { id: messageId } }),
        database_1.default.conversation.update({
            where: { id: message.conversationId },
            data: { updatedAt: new Date() },
        }),
    ]);
    await (0, service_1.createAuditLog)({
        actorId: userId,
        eventType: 'MESSAGE_DELETED',
        entityType: 'Message',
        entityId: messageId,
        metadata: { conversationId: message.conversationId },
    });
    return {
        messageId,
        conversationId: message.conversationId,
    };
}
