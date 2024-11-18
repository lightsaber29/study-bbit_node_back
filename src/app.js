// src/app.js
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from './config/env.js';
import livekitRoutes from './routes/livekitRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';
import { initializeSocket } from './socket/meetingSocket.js';

export const createApp = () => {
  const app = express();
  const server = http.createServer(app);
  
  // Socket.io 설정
  const io = new Server(server, {
    cors: {
      origin: config.CORS_ORIGIN,
      methods: ["GET", "POST"]
    }
  });

  // Middleware
  app.use(cors({
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  }));
  app.use(express.json());
  app.use(express.raw({ type: "application/webhook+json" }));

  // Routes
  app.use('/', livekitRoutes);
  app.use('/api/meetings', meetingRoutes);

  // Socket 초기화
  initializeSocket(io);

  return { app, server };
};