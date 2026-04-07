declare global {
  namespace Express {
    interface UserPayload {
      id: string;
    }

    interface Request {
      userId?: string;
      user?: { id: string; email: string; name: string | null };
    }
  }
}

export {};