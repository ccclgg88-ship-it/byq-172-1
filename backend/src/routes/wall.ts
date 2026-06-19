import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb, AssessmentRow, UserRow, LikeRow, CommentRow } from '../db.js';
import { authMiddleware, optionalAuth } from '../auth.js';

const router = Router();

function computeCompatibility(tags1: string[], tags2: string[]): number {
  if (tags1.length === 0 && tags2.length === 0) return 100;
  if (tags1.length === 0 || tags2.length === 0) return 0;
  const set1 = new Set(tags1);
  const intersection = tags2.filter((t) => set1.has(t));
  const union = new Set([...tags1, ...tags2]);
  return Math.round((intersection.length / union.size) * 100);
}

router.get('/', optionalAuth, (req: Request, res: Response) => {
  const userId = (req as any).userId || null;
  const sort = req.query.sort === 'compatibility' ? 'compatibility' : 'latest';
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const db = getDb();

  if (!userId) {
    const rows = db.prepare(`
      SELECT a.*, u.nickname, u.avatar
      FROM assessments a
      JOIN users u ON a.user_id = u.id
      WHERE a.visibility = 'public'
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as (AssessmentRow & { nickname: string; avatar: string })[];

    const total = db.prepare("SELECT COUNT(*) as count FROM assessments WHERE visibility = 'public'").get() as { count: number };

    res.json({
      items: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        nickname: r.nickname,
        avatar: r.avatar,
        title: r.title,
        tags: JSON.parse(r.tags),
        visibility: r.visibility,
        createdAt: r.created_at,
        isGuest: true,
      })),
      total: total.count,
      page,
      hasMore: offset + limit < total.count,
    });
    return;
  }

  const blockedIds = db.prepare('SELECT blocked_id FROM blocks WHERE blocker_id = ?').all(userId) as { blocked_id: string }[];
  const blockedSet = new Set(blockedIds.map((b) => b.blocked_id));

  const friendIds = db.prepare('SELECT following_id FROM follows WHERE follower_id = ?').all(userId) as { following_id: string }[];
  const friendSet = new Set(friendIds.map((f) => f.following_id));

  const myLatestAssessment = db.prepare(
    "SELECT tags FROM assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
  ).get(userId) as { tags: string } | undefined;

  const myTags: string[] = myLatestAssessment ? JSON.parse(myLatestAssessment.tags) : [];

  const allRows = db.prepare(`
    SELECT a.*, u.nickname, u.avatar
    FROM assessments a
    JOIN users u ON a.user_id = u.id
    WHERE a.user_id != ?
    AND (
      a.visibility = 'public'
      OR (a.visibility = 'friends' AND a.user_id IN (${friendSet.size > 0 ? friendIds.map((f) => `'${f.following_id}'`).join(',') : "'__none__'"}))
    )
    ORDER BY a.created_at DESC
  `).all(userId) as (AssessmentRow & { nickname: string; avatar: string })[];

  const filtered = allRows.filter((r) => !blockedSet.has(r.user_id));

  const items = filtered.map((r) => {
    const theirTags: string[] = JSON.parse(r.tags);
    const compatibility = myTags.length > 0 ? computeCompatibility(myTags, theirTags) : 0;
    const likeCount = (db.prepare('SELECT COUNT(*) as count FROM likes WHERE assessment_id = ?').get(r.id) as { count: number }).count;
    const commentCount = (db.prepare('SELECT COUNT(*) as count FROM comments WHERE assessment_id = ?').get(r.id) as { count: number }).count;
    const isLiked = userId ? !!(db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND assessment_id = ?').get(userId, r.id)) : false;

    return {
      id: r.id,
      userId: r.user_id,
      nickname: r.nickname,
      avatar: r.avatar,
      title: r.title,
      tags: theirTags,
      visibility: r.visibility,
      createdAt: r.created_at,
      compatibility,
      likeCount,
      commentCount,
      isLiked,
    };
  });

  if (sort === 'compatibility') {
    items.sort((a, b) => b.compatibility - a.compatibility);
  }

  const pagedItems = items.slice(offset, offset + limit);

  res.json({
    items: pagedItems,
    total: items.length,
    page,
    hasMore: offset + limit < items.length,
  });
});

router.post('/:id/like', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const db = getDb();

  const assessment = db.prepare('SELECT * FROM assessments WHERE id = ?').get(id) as AssessmentRow | undefined;
  if (!assessment) {
    res.status(404).json({ error: '测评不存在' });
    return;
  }

  const existing = db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND assessment_id = ?').get(userId, id);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE user_id = ? AND assessment_id = ?').run(userId, id);
    res.json({ liked: false });
  } else {
    db.prepare('INSERT INTO likes (user_id, assessment_id) VALUES (?, ?)').run(userId, id);
    res.json({ liked: true });
  }
});

router.get('/:id/comments', optionalAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();

  const comments = db.prepare(`
    SELECT c.*, u.nickname, u.avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.assessment_id = ?
    ORDER BY c.created_at ASC
  `).all(id) as (CommentRow & { nickname: string; avatar: string })[];

  res.json({
    items: comments.map((c) => ({
      id: c.id,
      userId: c.user_id,
      nickname: c.nickname,
      avatar: c.avatar,
      content: c.content,
      createdAt: c.created_at,
    })),
  });
});

router.post('/:id/comments', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    res.status(400).json({ error: '留言内容不能为空' });
    return;
  }
  if (content.length > 100) {
    res.status(400).json({ error: '留言不能超过100字' });
    return;
  }

  const db = getDb();
  const assessment = db.prepare('SELECT * FROM assessments WHERE id = ?').get(id) as AssessmentRow | undefined;
  if (!assessment) {
    res.status(404).json({ error: '测评不存在' });
    return;
  }

  const commentId = uuid();

  db.prepare(
    'INSERT INTO comments (id, assessment_id, user_id, content) VALUES (?, ?, ?, ?)'
  ).run(commentId, id, userId, content.trim());

  const user = db.prepare('SELECT nickname, avatar FROM users WHERE id = ?').get(userId) as { nickname: string; avatar: string };

  res.status(201).json({
    id: commentId,
    userId,
    nickname: user.nickname,
    avatar: user.avatar,
    content: content.trim(),
  });
});

router.delete('/comments/:commentId', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { commentId } = req.params;
  const db = getDb();

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId) as CommentRow | undefined;
  if (!comment) {
    res.status(404).json({ error: '留言不存在' });
    return;
  }

  const assessment = db.prepare('SELECT * FROM assessments WHERE id = ?').get(comment.assessment_id) as AssessmentRow | undefined;

  if (comment.user_id !== userId && assessment?.user_id !== userId) {
    res.status(403).json({ error: '只能删除自己的留言或自己测评下的留言' });
    return;
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
  res.json({ success: true });
});

export default router;
