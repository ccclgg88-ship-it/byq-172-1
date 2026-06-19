import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/persona.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDb(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      tags TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'friends' CHECK(visibility IN ('public', 'friends', 'private')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blocks (
      blocker_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (blocker_id, blocked_id),
      FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS likes (
      user_id TEXT NOT NULL,
      assessment_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, assessment_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      sender_id TEXT,
      type TEXT NOT NULL CHECK(type IN ('like', 'comment', 'follow', 'mutual_follow')),
      assessment_id TEXT,
      comment_id TEXT,
      content TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
      FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
    CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at);
    CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
    CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
    CREATE INDEX IF NOT EXISTS idx_likes_assessment ON likes(assessment_id);
    CREATE INDEX IF NOT EXISTS idx_comments_assessment ON comments(assessment_id);
    CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
  `);

  cleanupOldMessages();
}

export interface UserRow {
  id: string;
  nickname: string;
  avatar: string;
  password_hash: string;
  invite_code: string;
  created_at: string;
}

export interface AssessmentRow {
  id: string;
  user_id: string;
  title: string;
  tags: string;
  visibility: 'public' | 'friends' | 'private';
  created_at: string;
}

export interface FollowRow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface BlockRow {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface LikeRow {
  user_id: string;
  assessment_id: string;
  created_at: string;
}

export interface CommentRow {
  id: string;
  assessment_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface MessageRow {
  id: string;
  user_id: string;
  sender_id: string | null;
  type: 'like' | 'comment' | 'follow' | 'mutual_follow';
  assessment_id: string | null;
  comment_id: string | null;
  content: string | null;
  read: number;
  created_at: string;
}

export function cleanupOldMessages(): void {
  const db = getDb();
  db.prepare("DELETE FROM messages WHERE created_at < datetime('now', '-90 days')").run();
}

export function createMessage(
  db: Database.Database,
  senderId: string | null,
  receiverId: string,
  type: 'like' | 'comment' | 'follow' | 'mutual_follow',
  assessmentId?: string,
  commentId?: string,
  content?: string
): void {
  if (senderId) {
    const blocked = db.prepare(
      'SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?'
    ).get(receiverId, senderId);
    if (blocked) return;
  }

  const id = uuid();
  db.prepare(
    'INSERT INTO messages (id, user_id, sender_id, type, assessment_id, comment_id, content) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    receiverId,
    senderId,
    type,
    assessmentId || null,
    commentId || null,
    content || null
  );
}
