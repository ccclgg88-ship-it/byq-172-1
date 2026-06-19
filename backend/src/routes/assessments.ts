import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb, AssessmentRow } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

const TITLES = [
  '梦境编织者', '理性守望者', '自由灵魂', '温暖治愈师',
  '深度思考者', '创意先锋', '浪漫主义者', '逻辑大师',
  '灵感捕手', '内心旅行家', '勇气践行者', '温柔观察者',
];

const TAG_POOL = [
  '浪漫主义', '理想主义', '深度思考', '创意无限', '敏感细腻', '温暖治愈',
  '理性分析', '逻辑缜密', '自由奔放', '勇敢无畏', '细腻观察', '幽默风趣',
  '共情大师', '战略思维', '艺术气质', '冒险精神', '安静力量', '社交达人',
  '独立思考', '好奇心强', '完美主义', '直觉敏锐', '坚韧不拔', '包容大度',
];

function generateRandomAssessment(): { title: string; tags: string[] } {
  const title = TITLES[Math.floor(Math.random() * TITLES.length)];
  const shuffled = [...TAG_POOL].sort(() => Math.random() - 0.5);
  const tags = shuffled.slice(0, 3);
  return { title, tags };
}

router.post('/', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { title, tags, visibility } = req.body;

  let finalTitle = title;
  let finalTags = tags;

  if (!finalTitle || !finalTags || !Array.isArray(finalTags) || finalTags.length === 0) {
    const generated = generateRandomAssessment();
    finalTitle = finalTitle || generated.title;
    finalTags = finalTags && finalTags.length > 0 ? finalTags : generated.tags;
  }

  if (finalTags.length > 10) {
    res.status(400).json({ error: '标签数量不能超过10个' });
    return;
  }

  const validVisibility = ['public', 'friends', 'private'].includes(visibility)
    ? visibility
    : 'friends';

  const db = getDb();
  const id = uuid();
  const tagsJson = JSON.stringify(finalTags);

  db.prepare(
    'INSERT INTO assessments (id, user_id, title, tags, visibility) VALUES (?, ?, ?, ?, ?)'
  ).run(id, userId, finalTitle, tagsJson, validVisibility);

  const assessment = db.prepare('SELECT * FROM assessments WHERE id = ?').get(id) as AssessmentRow;
  res.status(201).json({
    id: assessment.id,
    title: assessment.title,
    tags: JSON.parse(assessment.tags),
    visibility: assessment.visibility,
    createdAt: assessment.created_at,
  });
});

router.get('/', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 50;
  const offset = (page - 1) * limit;

  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM assessments WHERE user_id = ?').get(userId) as { count: number };
  const rows = db.prepare(
    'SELECT * FROM assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(userId, limit, offset) as AssessmentRow[];

  res.json({
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      tags: JSON.parse(r.tags),
      visibility: r.visibility,
      createdAt: r.created_at,
    })),
    total: total.count,
    page,
    hasMore: offset + limit < total.count,
  });
});

router.get('/compare', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id1, id2 } = req.query;

  if (!id1 || !id2) {
    res.status(400).json({ error: '请提供两条测评ID' });
    return;
  }

  const db = getDb();
  const a1 = db.prepare('SELECT * FROM assessments WHERE id = ? AND user_id = ?').get(id1, userId) as AssessmentRow | undefined;
  const a2 = db.prepare('SELECT * FROM assessments WHERE id = ? AND user_id = ?').get(id2, userId) as AssessmentRow | undefined;

  if (!a1 || !a2) {
    res.status(404).json({ error: '测评记录不存在' });
    return;
  }

  const tags1: string[] = JSON.parse(a1.tags);
  const tags2: string[] = JSON.parse(a2.tags);
  const set1 = new Set(tags1);
  const set2 = new Set(tags2);

  const added = tags2.filter((t) => !set1.has(t));
  const removed = tags1.filter((t) => !set2.has(t));
  const kept = tags1.filter((t) => set2.has(t));

  res.json({
    first: {
      id: a1.id,
      title: a1.title,
      tags: tags1,
      createdAt: a1.created_at,
    },
    second: {
      id: a2.id,
      title: a2.title,
      tags: tags2,
      createdAt: a2.created_at,
    },
    diff: { added, removed, kept },
  });
});

router.delete('/:id', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const db = getDb();
  const assessment = db.prepare('SELECT * FROM assessments WHERE id = ? AND user_id = ?').get(id, userId) as AssessmentRow | undefined;

  if (!assessment) {
    res.status(404).json({ error: '测评记录不存在' });
    return;
  }

  db.prepare('DELETE FROM assessments WHERE id = ?').run(id);
  res.json({ success: true });
});

router.patch('/:id/visibility', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const { visibility } = req.body;

  if (!['public', 'friends', 'private'].includes(visibility)) {
    res.status(400).json({ error: '无效的可见范围' });
    return;
  }

  const db = getDb();
  const result = db.prepare('UPDATE assessments SET visibility = ? WHERE id = ? AND user_id = ?').run(visibility, id, userId);

  if (result.changes === 0) {
    res.status(404).json({ error: '测评记录不存在' });
    return;
  }

  res.json({ success: true });
});

export default router;
