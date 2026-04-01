import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export default function verifyToken(req: Request, res: Response, next: NextFunction) {
  if (!JWT_SECRET) {
    return res.status(500).json({ message: 'JWT_SECRET is not configured' });
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  console.log('Token received:', token);

  if (!token) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const payload = decoded as any;
    const userId = payload?.sub ?? payload?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    (req as any).user = payload;
    (req as any).userId = userId;
    next();
  });
}
