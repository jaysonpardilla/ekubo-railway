import { Router } from 'express';
import { db } from '../db/schema.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res) => {
  try {
    let query = 'SELECT * FROM programs';

    if (!['admin', 'mswdo'].includes(req.userType!)) {
      query += ' WHERE is_active = 1';
    }

    const programs: any[] = db.prepare(query).all() as any[];

    const formattedPrograms = programs.map(program => ({
      ...program,
      classification: program.classification ? JSON.parse(program.classification) : [],
      requirements: program.requirements ? JSON.parse(program.requirements) : [],
      is_active: program.is_active === 1
    }));

    res.json(formattedPrograms);
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const program: any = db.prepare('SELECT * FROM programs WHERE id = ?').get(id);

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const formattedProgram = {
      ...program,
      classification: program.classification ? JSON.parse(program.classification) : [],
      requirements: program.requirements ? JSON.parse(program.requirements) : [],
      is_active: program.is_active === 1
    };

    res.json(formattedProgram);
  } catch (error) {
    console.error('Get program error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, requireRole('admin', 'mswdo'), (req: AuthRequest, res) => {
  try {
    const { name, description, classification, requirements, programType, isActive } = req.body;

    if (!name || !description || !classification || !requirements || !programType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const programId = randomUUID();

    db.prepare(`
      INSERT INTO programs (id, name, description, classification, requirements, program_type, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      programId,
      name,
      description,
      JSON.stringify(classification),
      JSON.stringify(requirements),
      programType,
      isActive !== false ? 1 : 0
    );

    const program: any = db.prepare('SELECT * FROM programs WHERE id = ?').get(programId);

    const formattedProgram = {
      ...program,
      classification: JSON.parse(program.classification),
      requirements: JSON.parse(program.requirements),
      is_active: program.is_active === 1
    };

    res.status(201).json(formattedProgram);
  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', authenticateToken, requireRole('admin', 'mswdo'), (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, classification, requirements, programType, isActive } = req.body;

    const program = db.prepare('SELECT id FROM programs WHERE id = ?').get(id);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (classification !== undefined) {
      updates.push('classification = ?');
      values.push(JSON.stringify(classification));
    }

    if (requirements !== undefined) {
      updates.push('requirements = ?');
      values.push(JSON.stringify(requirements));
    }

    if (programType !== undefined) {
      updates.push('program_type = ?');
      values.push(programType);
    }

    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive ? 1 : 0);
    }

    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE programs SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated: any = db.prepare('SELECT * FROM programs WHERE id = ?').get(id);

    const formattedProgram = {
      ...updated,
      classification: JSON.parse(updated.classification),
      requirements: JSON.parse(updated.requirements),
      is_active: updated.is_active === 1
    };

    res.json(formattedProgram);
  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const program = db.prepare('SELECT id FROM programs WHERE id = ?').get(id);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    db.prepare('DELETE FROM programs WHERE id = ?').run(id);

    res.status(204).send();
  } catch (error) {
    console.error('Delete program error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
