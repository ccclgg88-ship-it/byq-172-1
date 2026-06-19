import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import assessmentRoutes from './routes/assessments.js';
import socialRoutes from './routes/social.js';
import wallRoutes from './routes/wall.js';

const app = express();
const PORT = 8009;

app.use(cors());
app.use(express.json());

initDb();

app.use('/api/auth', authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/wall', wallRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
