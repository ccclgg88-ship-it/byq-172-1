import { Router, Request, Response } from 'express';
import { getDb, UserRow, FollowRow, createMessage } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

router.get('/invite-code', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const db = getDb();
  const user = db.prepare('SELECT invite_code FROM users WHERE id = ?').get(userId) as { invite_code: string } | undefined;
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  res.json({ inviteCode: user.invite_code });
});

router.post('/follow', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { inviteCode } = req.body;

  if (!inviteCode) {
    res.status(400).json({ error: '请提供邀请码' });
    return;
  }

  const db = getDb();
  const target = db.prepare('SELECT * FROM users WHERE invite_code = ?').get(inviteCode) as UserRow | undefined;

  if (!target) {
    res.status(404).json({ error: '邀请码无效' });
    return;
  }

  if (target.id === userId) {
    res.status(400).json({ error: '不能关注自己' });
    return;
  }

  const blocked = db.prepare(
    'SELECT 1 FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)'
  ).get(userId, target.id, target.id, userId);

  if (blocked) {
    res.status(403).json({ error: '无法关注该用户' });
    return;
  }

  const followingCount = db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').get(userId) as { count: number };
  if (followingCount.count >= 50) {
    res.status(400).json({ error: '关注上限50人' });
    return;
  }

  try {
    db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(userId, target.id);
  } catch {
    res.status(500).json({ error: '关注失败' });
    return;
  }

  const mutual = db.prepare(
    'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?'
  ).get(target.id, userId);

  const targetBlockedMe = db.prepare(
    'SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?'
  ).get(target.id, userId);
  if (!targetBlockedMe) {
    createMessage(db, userId, target.id, 'follow');
  }
  if (mutual) {
    const meBlockedTarget = db.prepare(
      'SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?'
    ).get(userId, target.id);
    if (!meBlockedTarget) {
      createMessage(db, target.id, userId, 'mutual_follow');
    }
  }

  res.json({
    success: true,
    target: {
      id: target.id,
      nickname: target.nickname,
      avatar: target.avatar,
    },
    mutual: !!mutual,
  });
});

router.delete('/follow/:userId', authMiddleware, (req: Request, res: Response) => {
  const myId = (req as any).userId;
  const targetId = req.params.userId;

  const db = getDb();
  db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(myId, targetId);
  res.json({ success: true });
});

router.post('/block', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { targetId } = req.body;

  if (!targetId) {
    res.status(400).json({ error: '请提供目标用户ID' });
    return;
  }

  if (targetId === userId) {
    res.status(400).json({ error: '不能拉黑自己' });
    return;
  }

  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)').run(userId, targetId);
  db.prepare('DELETE FROM follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)').run(userId, targetId, targetId, userId);

  res.json({ success: true });
});

router.delete('/block/:userId', authMiddleware, (req: Request, res: Response) => {
  const myId = (req as any).userId;
  const targetId = req.params.userId;

  const db = getDb();
  db.prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?').run(myId, targetId);
  res.json({ success: true });
});

router.get('/list', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const db = getDb();

  const following = db.prepare(`
    SELECT u.id, u.nickname, u.avatar
    FROM follows f
    JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ?
    ORDER BY f.created_at DESC
  `).all(userId) as { id: string; nickname: string; avatar: string }[];

  const followers = db.prepare(`
    SELECT u.id, u.nickname, u.avatar
    FROM follows f
    JOIN users u ON f.follower_id = u.id
    WHERE f.following_id = ?
    ORDER BY f.created_at DESC
  `).all(userId) as { id: string; nickname: string; avatar: string }[];

  res.json({ following, followers });
});

export default router;
