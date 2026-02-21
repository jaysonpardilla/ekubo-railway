import { Router } from 'express';
import { db } from '../db/schema.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = Router();

router.get('/', authenticateToken, requireRole('admin', 'mswdo', 'bhw'), (req: AuthRequest, res) => {
  try {
    let query = `
      SELECT b.*, u.first_name, u.last_name, u.middle_name, u.email, u.address, u.contact_number
      FROM beneficiaries b
      JOIN users u ON u.id = b.user_id
    `;

    if (req.userType === 'bhw') {
      const assignments = db.prepare('SELECT barangay FROM bhw_assignments WHERE bhw_user_id = ?').all(req.userId);
      const barangays = (assignments as any[]).map(a => a.barangay);
      if (barangays.length === 0) {
        return res.json([]);
      }
      const placeholders = barangays.map(() => '?').join(',');
      query += ` WHERE u.address IN (${placeholders})`;
      const beneficiaries = db.prepare(query).all(...barangays);
      return res.json(beneficiaries);
    }

    const beneficiaries = db.prepare(query).all();
    res.json(beneficiaries);
  } catch (error) {
    console.error('Get beneficiaries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const beneficiary: any = db.prepare(`
      SELECT b.*, u.first_name, u.last_name, u.middle_name, u.email, u.address, u.contact_number
      FROM beneficiaries b
      JOIN users u ON u.id = b.user_id
      WHERE b.id = ?
    `).get(id);

    if (!beneficiary) {
      return res.status(404).json({ error: 'Beneficiary not found' });
    }

    if (req.userId !== beneficiary.user_id && !['admin', 'mswdo'].includes(req.userType!)) {
      if (req.userType === 'bhw') {
        const assignment = db.prepare('SELECT id FROM bhw_assignments WHERE bhw_user_id = ? AND barangay = ?').get(req.userId, beneficiary.address);
        if (!assignment) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
      } else {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    res.json(beneficiary);
  } catch (error) {
    console.error('Get beneficiary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, (req: AuthRequest, res) => {
  try {
    const {
      classification, latitude, longitude, dateOfBirth, pwdIdNumber,
      guardianName, guardianContact, guardianRelationship,
      seniorIdUrl, psaUrl, postalIdUrl, votersIdUrl, nationalIdUrl,
      medicalCertUrl, govtIdUrl, pwdFormUrl, barangayCertUrl,
      deathCertUrl, medicalRecordsUrl
    } = req.body;

    if (!classification) {
      return res.status(400).json({ error: 'Classification is required' });
    }

    const existingBeneficiary = db.prepare('SELECT id FROM beneficiaries WHERE user_id = ?').get(req.userId);
    if (existingBeneficiary) {
      return res.status(400).json({ error: 'Beneficiary profile already exists' });
    }

    const beneficiaryId = randomUUID();

    db.prepare(`
      INSERT INTO beneficiaries (
        id, user_id, classification, latitude, longitude, date_of_birth,
        pwd_id_number, guardian_name, guardian_contact, guardian_relationship,
        senior_id_url, psa_url, postal_id_url, voters_id_url, national_id_url,
        medical_cert_url, govt_id_url, pwd_form_url, barangay_cert_url,
        death_cert_url, medical_records_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      beneficiaryId, req.userId, classification, latitude, longitude, dateOfBirth,
      pwdIdNumber, guardianName, guardianContact, guardianRelationship,
      seniorIdUrl, psaUrl, postalIdUrl, votersIdUrl, nationalIdUrl,
      medicalCertUrl, govtIdUrl, pwdFormUrl, barangayCertUrl,
      deathCertUrl, medicalRecordsUrl
    );

    const beneficiary = db.prepare('SELECT * FROM beneficiaries WHERE id = ?').get(beneficiaryId);
    res.status(201).json(beneficiary);
  } catch (error) {
    console.error('Create beneficiary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const beneficiary: any = db.prepare('SELECT user_id FROM beneficiaries WHERE id = ?').get(id);
    if (!beneficiary) {
      return res.status(404).json({ error: 'Beneficiary not found' });
    }

    if (req.userId !== beneficiary.user_id && !['admin', 'mswdo'].includes(req.userType!)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updates: string[] = [];
    const values: any[] = [];

    const fields = [
      'classification', 'latitude', 'longitude', 'date_of_birth', 'pwd_id_number',
      'guardian_name', 'guardian_contact', 'guardian_relationship', 'status',
      'senior_id_url', 'psa_url', 'postal_id_url', 'voters_id_url', 'national_id_url',
      'medical_cert_url', 'govt_id_url', 'pwd_form_url', 'barangay_cert_url',
      'death_cert_url', 'medical_records_url'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    });

    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE beneficiaries SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM beneficiaries WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Update beneficiary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/user/:userId', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    if (req.userId !== userId && !['admin', 'mswdo'].includes(req.userType!)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const beneficiary = db.prepare('SELECT * FROM beneficiaries WHERE user_id = ?').get(userId);

    if (!beneficiary) {
      return res.status(404).json({ error: 'Beneficiary not found' });
    }

    res.json(beneficiary);
  } catch (error) {
    console.error('Get beneficiary by user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
