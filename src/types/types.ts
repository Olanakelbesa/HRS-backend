export interface CreateReviewInput {
  userId: string;
  propertyId: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewInput {
  rating?: number;
  comment?: string;
}

export interface Review {
  id: string;
  userId: string;
  propertyId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}