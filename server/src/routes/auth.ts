// @ts-ignore
import { Router, Request, Response, NextFunction } from 'express';
// @ts-ignore
import bcrypt from 'bcryptjs';
// @ts-ignore
import jwt from 'jsonwebtoken';
// @ts-ignore
import { z } from 'zod';
import { query } from '../db';
import { generateVerificationToken, generateTokenExpiration, isTokenExpired } from '../services/tokenService';
import { sendVerificationEmail } from '../services/emailService';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

authRouter.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
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
    
    // Generate verification token and expiration
    const verificationToken = generateVerificationToken();
    const tokenExpiration = generateTokenExpiration();
    
    // Create user with verification token
    const result = await query(
      `INSERT INTO users 
       (email, password_hash, name, email_verified, verification_token, verification_token_expires_at) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [email, passwordHash, name, false, verificationToken, tokenExpiration]
    );
    
    // Send verification email
    await sendVerificationEmail(
      email,
      verificationToken,
      CLIENT_URL
    );
    
    // Generate token
    const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET);
    
    res.status(201).json({ 
      token,
      emailVerified: false,
      message: 'Please check your email to verify your account' 
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = UserSchema.parse(req.body);
    
    // Find user
    const result = await query(
      'SELECT id, password_hash, email_verified FROM users WHERE email = $1',
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
    
    res.json({ 
      token,
      emailVerified: result.rows[0].email_verified 
    });
  } catch (err) {
    next(err);
  }
});

// Verify email with token
authRouter.get('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Invalid verification token' });
    }
    
    // Find user with this token
    const result = await query(
      `SELECT id, verification_token_expires_at 
       FROM users 
       WHERE verification_token = $1`,
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }
    
    const user = result.rows[0];
    
    // Check if token is expired
    if (isTokenExpired(user.verification_token_expires_at)) {
      return res.status(400).json({ message: 'Verification token has expired' });
    }
    
    // Update user as verified
    await query(
      `UPDATE users 
       SET email_verified = true, 
           verification_token = NULL, 
           verification_token_expires_at = NULL 
       WHERE id = $1`,
      [user.id]
    );
    
    // Redirect to frontend with success message
    res.redirect(`${CLIENT_URL}/email-verified`);
  } catch (err) {
    next(err);
  }
});

// Resend verification email
authRouter.post('/resend-verification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user
    const result = await query(
      'SELECT id, email_verified FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      // For security reasons, don't disclose that the email doesn't exist
      return res.status(200).json({ message: 'If your email exists, a verification link has been sent' });
    }
    
    const user = result.rows[0];
    
    // If already verified
    if (user.email_verified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }
    
    // Generate new verification token and expiration
    const verificationToken = generateVerificationToken();
    const tokenExpiration = generateTokenExpiration();
    
    // Update user with new token
    await query(
      `UPDATE users 
       SET verification_token = $1, 
           verification_token_expires_at = $2 
       WHERE id = $3`,
      [verificationToken, tokenExpiration, user.id]
    );
    
    // Send verification email
    await sendVerificationEmail(
      email,
      verificationToken,
      CLIENT_URL
    );
    
    res.status(200).json({ message: 'Verification email has been sent' });
  } catch (err) {
    next(err);
  }
});

// Delete user account
authRouter.delete('/delete-account', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthRequest;
    
    console.log('Delete account request received for user ID:', userId);
    
    // Delete all tasks for this user first (to avoid foreign key constraints)
    const tasksResult = await query(
      'DELETE FROM tasks WHERE user_id = $1 RETURNING id',
      [userId]
    );
    
    console.log(`Deleted ${tasksResult.rows.length} tasks for user ID: ${userId}`);
    
    // Delete the user account
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [userId]
    );
    
    if (result.rows.length === 0) {
      console.log('User not found for ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Successfully deleted user ID:', userId);
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Error in delete-account endpoint:', err);
    next(err);
  }
});

// FOR DEVELOPMENT ONLY: Endpoint to manually verify an email address
authRouter.post('/dev-verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    console.log('Development route: Manually verifying email:', email);
    
    // Find user
    const result = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user as verified
    await query(
      `UPDATE users 
       SET email_verified = true, 
           verification_token = NULL, 
           verification_token_expires_at = NULL 
       WHERE id = $1`,
      [result.rows[0].id]
    );
    
    console.log('Email manually verified for development:', email);
    
    res.status(200).json({ 
      message: 'Email verified for development purposes',
      emailVerified: true
    });
  } catch (err) {
    console.error('Error in dev-verify-email endpoint:', err);
    next(err);
  }
}); 