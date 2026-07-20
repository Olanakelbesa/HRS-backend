"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
const resend_1 = require("resend");
const env_1 = require("../config/env");
const resend = env_1.env.RESEND_API_KEY ? new resend_1.Resend(env_1.env.RESEND_API_KEY) : null;
const sendEmail = async (templateName, to, variables, subject) => {
    if (!resend) {
        throw new Error('Email provider is not configured. Set RESEND_API_KEY.');
    }
    const templatePath = path_1.default.join(__dirname, 'templates', `${templateName}.hbs`);
    const source = fs_1.default.readFileSync(templatePath, 'utf8');
    const compiledTemplate = handlebars_1.default.compile(source);
    const html = compiledTemplate(variables);
    const message = {
        from: env_1.env.EMAIL_FROM,
        to,
        subject: subject || 'Notification from House Rental',
        html,
    };
    const { error } = await resend.emails.send(message);
    if (error) {
        throw new Error(`Resend failed to send email: ${error.message}`);
    }
};
exports.sendEmail = sendEmail;
