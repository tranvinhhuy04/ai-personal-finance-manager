import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

type TokenType = 'access' | 'refresh' | '2fa_pending';

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  return token ?? null;
}

export default function requireAuth(expectedType: TokenType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);
    if (!token) return res.status(401).json({ message: 'Access token missing' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ message: 'Invalid or expired token' });
      const payload = decoded as any;
      if (payload?.type !== expectedType) {
        return res.status(401).json({ message: 'Invalid token type' });
      }
      (req as any).userId = payload.sub;
      return next();
    });
  };
}

