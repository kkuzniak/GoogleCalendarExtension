import 'dotenv/config';
import express from 'express';
import { authRouter } from './controllers/authController.js';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { googleCalendarRouter } from './controllers/googleCalendarController.js';
import { cleanupConnections } from './utils.js';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';

const PORT = process.env.PORT || 3000;

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  }),
);

app.use('/auth', authRouter);
app.use('/google-calendar', googleCalendarRouter);

server.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received. Cleaning up...');
  await cleanupConnections();
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received. Cleaning up...');
  await cleanupConnections();
});
