import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db/schema.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import beneficiaryRoutes from './routes/beneficiaries.js';
import applicationRoutes from './routes/applications.js';
import programRoutes from './routes/programs.js';
import notificationRoutes from './routes/notifications.js';
import uploadRoutes from './routes/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

initializeDatabase();

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'MSWDO Backend API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
