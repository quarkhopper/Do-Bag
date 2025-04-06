import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

authRouter.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name } = UserSchema.parse(req.body);
    
    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
      [email, passwordHash, name]
    );
    
    // Generate token
    const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET);
    
    res.status(201).json({ token });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = UserSchema.parse(req.body);
    
    // Find user
    const result = await query(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Verify password
    const valid = await bcrypt.compare(password, result.rows[0].password_hash);
    
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET);
    
    res.json({ token });
  } catch (err) {
    next(err);
  }
}); 