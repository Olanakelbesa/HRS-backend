import { Request, Response } from 'express';
import { resyncAllEmbeddings } from './embeddings.service';

export async function resyncEmbeddingsController(req: Request, res: Response) {
  try {
    console.log('🔄 Admin triggered embedding resync...');

    const result = await resyncAllEmbeddings();

    return res.status(200).json({
      message: 'Embedding resync completed',
      ...result,
    });
  } catch (error: any) {
    console.error('Resync failed:', error);

    return res.status(500).json({
      message: 'Embedding resync failed',
      error: error.message,
    });
  }
}
