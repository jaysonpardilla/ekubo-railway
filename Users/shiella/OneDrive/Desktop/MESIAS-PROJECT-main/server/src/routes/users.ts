import { Router } from 'express';
import { db } from '../db/schema.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, requireRole('admin', 'mswdo'), (req: AuthRequest, res) => {
  try {
    const users = db.prepare('SELECT id, email, first_name, last_name, middle_name, username, address, contact_number, date_of_birth, user_type, created_at FROM users').all();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (req.userId !== id && !['admin', 'mswdo'].includes(req.userType!)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const user = db.prepare('SELECT id, email, first_name, last_name, middle_name, username, address, contact_number, date_of_birth, user_type, created_at FROM users WHERE id = ?').get(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (req.userId !== id && !['admin'].includes(req.userType!)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { firstName, lastName, middleName, address, contactNumber, dateOfBirth } = req.body;

    db.prepare(`
      UPDATE users
      SET first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          middle_name = COALESCE(?, middle_name),
          address = COALESCE(?, address),
          contact_number = COALESCE(?, contact_number),
          date_of_birth = COALESCE(?, date_of_birth),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(firstName, lastName, middleName, address, contactNumber, dateOfBirth, id);

    const user = db.prepare('SELECT id, email, first_name, last_name, middle_name, username, address, contact_number, date_of_birth, user_type, created_at FROM users WHERE id = ?').get(id);

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats/counts', authenticateToken, requireRole('admin'), (req: AuthRequest, res) => {
  try {
    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM users').get() as any,
      beneficiaries: db.prepare('SELECT COUNT(*) as count FROM users WHERE user_type = "beneficiary"').get() as any,
      bhws: db.prepare('SELECT COUNT(*) as count FROM users WHERE user_type = "bhw"').get() as any,
      mswdo: db.prepare('SELECT COUNT(*) as count FROM users WHERE user_type = "mswdo"').get() as any,
    };

    res.json({
      total: stats.total.count,
      beneficiaries: stats.beneficiaries.count,
      bhws: stats.bhws.count,
      mswdo: stats.mswdo.count,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
