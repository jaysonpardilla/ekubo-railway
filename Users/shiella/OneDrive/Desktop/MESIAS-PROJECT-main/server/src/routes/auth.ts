import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db/schema.js';
import { randomUUID } from 'crypto';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, middleName, username, address, contactNumber, dateOfBirth, userType } = req.body;

    if (!email || !password || !firstName || !lastName || !username || !address || !userType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, middle_name, username, address, contact_number, date_of_birth, user_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email, passwordHash, firstName, lastName, middleName || null, username, address, contactNumber || null, dateOfBirth || null, userType);

    const token = jwt.sign({ userId, userType }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    const user = db.prepare('SELECT id, email, first_name, last_name, middle_name, username, address, contact_number, date_of_birth, user_type, created_at FROM users WHERE id = ?').get(userId);

    res.json({ token, user });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, userType: user.user_type }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    const { password_hash, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticateToken, (req: AuthRequest, res) => {
  try {
    const user = db.prepare('SELECT id, email, first_name, last_name, middle_name, username, address, contact_number, date_of_birth, user_type, created_at FROM users WHERE id = ?').get(req.userId!);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
