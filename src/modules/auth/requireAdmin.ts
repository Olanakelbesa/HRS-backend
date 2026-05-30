export function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
}
