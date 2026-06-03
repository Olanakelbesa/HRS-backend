import { Request, Response } from 'express';
import prisma from '../../config/database';
import { logger } from '../../core/logger';

export const getRecommendationData = async (req: Request, res: Response) => {
    try {
        logger.info('Recommendation Service requested training data export.');

        // 1. Fetch Interactions
        const interactionsRows = await prisma.userInteractionEvent.findMany({
            select: {
                userId: true,
                propertyId: true,
                type: true,
            },
        });

        // 2. Fetch User Preferences
        const preferencesRows = await prisma.userPreference.findMany({
            select: {
                userId: true,
                preferredType: true,
                preferredLocations: true,
                preferredAmenities: true,
                preferredPriceMin: true,
                preferredPriceMax: true,
                preferredBedrooms: true,
                furnishStatus: true,
            },
        });

        // 3. Fetch Properties
        const propertiesRows = await prisma.property.findMany({
            where: {
                isDeleted: false,
            },
            select: {
                id: true,
                category: true,
                status: true,
                bedrooms: true,
                furnishingStatus: true,
                amenities: true,
                price: true,
            },
        });

        res.status(200).json({
            interactions: interactionsRows,
            preferences: preferencesRows,
            properties: propertiesRows
        });
    } catch (error) {
        logger.error('Failed to export recommendation data', error as Error);
        res.status(500).json({ error: 'Internal server error during data export' });
    }
};
