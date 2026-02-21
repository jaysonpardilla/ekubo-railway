import { Router } from 'express';
import { db } from '../db/schema.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res) => {
  try {
    let query = `
      SELECT a.*, p.name as program_name, b.user_id as beneficiary_user_id,
             u.first_name, u.last_name, u.address as beneficiary_address
      FROM applications a
      JOIN programs p ON p.id = a.program_id
      JOIN beneficiaries b ON b.id = a.beneficiary_id
      JOIN users u ON u.id = b.user_id
    `;

    if (req.userType === 'beneficiary') {
      const beneficiary: any = db.prepare('SELECT id FROM beneficiaries WHERE user_id = ?').get(req.userId);
      if (!beneficiary) {
        return res.json([]);
      }
      query += ` WHERE a.beneficiary_id = ?`;
      const applications = db.prepare(query).all(beneficiary.id);
      return res.json(applications);
    }

    if (req.userType === 'bhw') {
      const assignments = db.prepare('SELECT barangay FROM bhw_assignments WHERE bhw_user_id = ?').all(req.userId);
      const barangays = (assignments as any[]).map(a => a.barangay);
      if (barangays.length === 0) {
        return res.json([]);
      }
      const placeholders = barangays.map(() => '?').join(',');
      query += ` WHERE u.address IN (${placeholders})`;
      const applications = db.prepare(query).all(...barangays);
      return res.json(applications);
    }

    const applications = db.prepare(query).all();
    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const application: any = db.prepare(`
      SELECT a.*, p.name as program_name, b.user_id as beneficiary_user_id,
             u.first_name, u.last_name, u.address as beneficiary_address
      FROM applications a
      JOIN programs p ON p.id = a.program_id
      JOIN beneficiaries b ON b.id = a.beneficiary_id
      JOIN users u ON u.id = b.user_id
      WHERE a.id = ?
    `).get(id);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { programId, formData } = req.body;

    if (!programId) {
      return res.status(400).json({ error: 'Program ID is required' });
    }

    const beneficiary: any = db.prepare('SELECT id FROM beneficiaries WHERE user_id = ?').get(req.userId);
    if (!beneficiary) {
      return res.status(400).json({ error: 'Beneficiary profile not found' });
    }

    const applicationId = randomUUID();

    db.prepare(`
      INSERT INTO applications (id, beneficiary_id, program_id, form_data)
      VALUES (?, ?, ?, ?)
    `).run(applicationId, beneficiary.id, programId, JSON.stringify(formData || {}));

    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
    res.status(201).json(application);
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, bhwNotes, mswdoNotes, denialReason } = req.body;

    const application: any = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);

      if (status === 'bhw_verified' && req.userType === 'bhw') {
        updates.push('bhw_verified_at = datetime("now")');
        updates.push('bhw_verified_by = ?');
        values.push(req.userId);
      }

      if (status === 'mswdo_approved' && req.userType === 'mswdo') {
        updates.push('mswdo_approved_at = datetime("now")');
        updates.push('mswdo_approved_by = ?');
        values.push(req.userId);
      }
    }

    if (bhwNotes !== undefined && req.userType === 'bhw') {
      updates.push('bhw_notes = ?');
      values.push(bhwNotes);
    }

    if (mswdoNotes !== undefined && ['mswdo', 'admin'].includes(req.userType!)) {
      updates.push('mswdo_notes = ?');
      values.push(mswdoNotes);
    }

    if (denialReason !== undefined) {
      updates.push('denial_reason = ?');
      values.push(denialReason);
    }

    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE applications SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats/counts', authenticateToken, requireRole('admin', 'mswdo'), (req: AuthRequest, res) => {
  try {
    const stats = {
      pending: db.prepare('SELECT COUNT(*) as count FROM applications WHERE status = "pending"').get() as any,
      verified: db.prepare('SELECT COUNT(*) as count FROM applications WHERE status = "bhw_verified"').get() as any,
      approved: db.prepare('SELECT COUNT(*) as count FROM applications WHERE status = "mswdo_approved"').get() as any,
      scheduled: db.prepare('SELECT COUNT(*) as count FROM applications WHERE status = "scheduled"').get() as any,
      claimed: db.prepare('SELECT COUNT(*) as count FROM applications WHERE status = "claimed"').get() as any,
    };

    res.json({
      pending: stats.pending.count,
      verified: stats.verified.count,
      approved: stats.approved.count,
      scheduled: stats.scheduled.count,
      claimed: stats.claimed.count,
    });
  } catch (error) {
    console.error('Get application stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
