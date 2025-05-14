import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  userId: number;
}

export const authMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.log('Auth middleware triggered for path:', req.path);
  console.log('Auth middleware headers:', req.headers.authorization ? 'Authorization header present' : 'No authorization header');
  
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    console.log('Auth middleware: No token provided');
    res.status(401).json({ message: 'No token provided' });
    return;
  }
  
  try {
    console.log('Auth middleware: Verifying token');
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    console.log('Auth middleware: Token verified, userId:', decoded.userId);
    (req as AuthRequest).userId = decoded.userId;
    next();
  } catch (err) {
    console.error('Auth middleware: Invalid token', err);
    res.status(401).json({ message: 'Invalid token' });
  }
}; 