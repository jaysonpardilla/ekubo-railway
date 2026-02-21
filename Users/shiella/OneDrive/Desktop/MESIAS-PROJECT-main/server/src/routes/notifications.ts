import { Router } from 'express';
import { db } from '../db/schema.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res) => {
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.userId);

    const formattedNotifications = (notifications as any[]).map(n => ({
      ...n,
      is_read: n.is_read === 1
    }));

    res.json(formattedNotifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { userId, title, message, type, relatedApplicationId } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const notificationId = randomUUID();

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, related_application_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(notificationId, userId, title, message, type || 'info', relatedApplicationId || null);

    const notification: any = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notificationId);

    const formattedNotification = {
      ...notification,
      is_read: notification.is_read === 1
    };

    res.status(201).json(formattedNotification);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/read', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const notification: any = db.prepare('SELECT user_id FROM notifications WHERE id = ?').get(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.user_id !== req.userId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);

    const updated: any = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);

    const formattedNotification = {
      ...updated,
      is_read: updated.is_read === 1
    };

    res.json(formattedNotification);
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const notification: any = db.prepare('SELECT user_id FROM notifications WHERE id = ?').get(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.user_id !== req.userId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    db.prepare('DELETE FROM notifications WHERE id = ?').run(id);

    res.status(204).send();
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
