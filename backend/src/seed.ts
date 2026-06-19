import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDb, initDb } from './db.js';

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

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function seed() {
  initDb();
  const db = getDb();

  const users = [
    { nickname: '小雨', password: '1234' },
    { nickname: '阿风', password: '1234' },
    { nickname: '橙子', password: '1234' },
    { nickname: '星辰', password: '1234' },
    { nickname: '云朵', password: '1234' },
  ];

  const userIds: string[] = [];

  for (const u of users) {
    const id = uuid();
    const hash = bcrypt.hashSync(u.password, 10);
    const code = generateInviteCode();
    const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(u.nickname)}`;

    try {
      db.prepare(
        'INSERT INTO users (id, nickname, avatar, password_hash, invite_code) VALUES (?, ?, ?, ?, ?)'
      ).run(id, u.nickname, avatar, hash, code);
      userIds.push(id);
    } catch {
      console.log(`User ${u.nickname} already exists, skipping`);
    }
  }

  for (const uid of userIds) {
    const numAssessments = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < numAssessments; i++) {
      const id = uuid();
      const title = TITLES[Math.floor(Math.random() * TITLES.length)];
      const tags = JSON.stringify(pickRandom(TAG_POOL, 3));
      const visibilities: ('public' | 'friends' | 'private')[] = ['public', 'friends', 'private'];
      const visibility = visibilities[Math.floor(Math.random() * visibilities.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString().replace('T', ' ').split('.')[0];

      db.prepare(
        'INSERT INTO assessments (id, user_id, title, tags, visibility, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, uid, title, tags, visibility, createdAt);
    }
  }

  if (userIds.length >= 3) {
    db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(userIds[0], userIds[1]);
    db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(userIds[1], userIds[0]);
    db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(userIds[0], userIds[2]);
    db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(userIds[2], userIds[0]);
    db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(userIds[1], userIds[2]);
  }

  console.log('Seed data created successfully!');
  console.log('Test users: 小雨, 阿风, 橙子, 星辰, 云朵 (password: 1234)');
}

seed();
