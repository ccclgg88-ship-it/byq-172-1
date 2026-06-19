import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getDb, UserRow } from '../db.js';
import { generateToken, authMiddleware } from '../auth.js';

const router = Router();

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

router.post('/register', (req: Request, res: Response) => {
  const { nickname, password } = req.body;
  if (!nickname || !password) {
    res.status(400).json({ error: '昵称和密码不能为空' });
    return;
  }
  if (nickname.length > 20) {
    res.status(400).json({ error: '昵称不能超过20个字符' });
    return;
  }
  if (password.length < 4) {
    res.status(400).json({ error: '密码至少4位' });
    return;
  }

  const db = getDb();
  const id = uuid();
  const passwordHash = bcrypt.hashSync(password, 10);
  const inviteCode = generateInviteCode();
  const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nickname)}`;

  try {
    db.prepare(
      'INSERT INTO users (id, nickname, avatar, password_hash, invite_code) VALUES (?, ?, ?, ?, ?)'
    ).run(id, nickname, avatar, passwordHash, inviteCode);

    const token = generateToken(id);
    res.status(201).json({
      token,
      user: { id, nickname, avatar, inviteCode },
    });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      res.status(409).json({ error: '邀请码冲突，请重试' });
      return;
    }
    res.status(500).json({ error: '注册失败' });
  }
});

router.post('/login', (req: Request, res: Response) => {
  const { nickname, password } = req.body;
  if (!nickname || !password) {
    res.status(400).json({ error: '昵称和密码不能为空' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE nickname = ?').get(nickname) as UserRow | undefined;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: '昵称或密码错误' });
    return;
  }

  const token = generateToken(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      inviteCode: user.invite_code,
    },
  });
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get((req as any).userId) as UserRow | undefined;
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  res.json({
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    inviteCode: user.invite_code,
  });
});

export default router;
