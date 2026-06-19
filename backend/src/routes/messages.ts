import { Router, Request, Response } from 'express';
import { getDb, MessageRow } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

router.get('/unread-count', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const db = getDb();

  const result = db.prepare(
    'SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND read = 0'
  ).get(userId) as { count: number };

  res.json({ count: result.count });
});

router.get('/', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const type = (req.query.type as string) || 'all';
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;
  const db = getDb();

  const typeConditions: string[] = ['user_id = ?'];
  const params: any[] = [userId];

  if (type !== 'all') {
    typeConditions.push('type = ?');
    params.push(type);
  }

  const whereClause = typeConditions.join(' AND ');

  const totalResult = db.prepare(
    `SELECT COUNT(*) as count FROM messages WHERE ${whereClause}`
  ).get(...params) as { count: number };

  const messages = db.prepare(`
    SELECT m.*, u.nickname as sender_nickname, u.avatar as sender_avatar, a.title as assessment_title
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    LEFT JOIN assessments a ON m.assessment_id = a.id
    WHERE ${whereClause.replace('user_id = ?', 'm.user_id = ?')}
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as (MessageRow & {
    sender_nickname: string | null;
    sender_avatar: string | null;
    assessment_title: string | null;
  })[];

  const unreadIds = messages.filter((m) => m.read === 0).map((m) => m.id);
  if (unreadIds.length > 0) {
    const placeholders = unreadIds.map(() => '?').join(',');
    db.prepare(`UPDATE messages SET read = 1 WHERE id IN (${placeholders})`).run(...unreadIds);
  }

  const items = messages.map((m) => ({
    id: m.id,
    type: m.type,
    content: m.content ?? undefined,
    read: m.read === 1 ? true : false,
    createdAt: m.created_at.replace(' ', 'T') + 'Z',
    senderId: m.sender_id ?? undefined,
    senderNickname: m.sender_nickname ?? undefined,
    senderAvatar: m.sender_avatar ?? undefined,
    assessmentId: m.assessment_id ?? undefined,
    assessmentTitle: m.assessment_title ?? undefined,
    commentId: m.comment_id ?? undefined,
  }));

  res.json({
    items,
    total: totalResult.count,
    page,
    hasMore: offset + limit < totalResult.count,
  });
});

router.post('/:id/read', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const db = getDb();

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as MessageRow | undefined;
  if (!message) {
    res.status(404).json({ error: '消息不存在' });
    return;
  }

  if (message.user_id !== userId) {
    res.status(403).json({ error: '无权操作' });
    return;
  }

  db.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(id);
  res.json({ success: true });
});

router.post('/read-all', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const db = getDb();

  db.prepare('UPDATE messages SET read = 1 WHERE user_id = ? AND read = 0').run(userId);
  res.json({ success: true });
});

export default router;
