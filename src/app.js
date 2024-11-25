// src/app.js
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from './config/env.js';
import livekitRoutes from './routes/livekitRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';
import dbRoutes from './routes/dbRoutes.js';
import { initializeSocket } from './socket/meetingSocket.js';
import bodyParser from 'body-parser';

export const createApp = () => {
  const app = express();
  const server = http.createServer(app);

  // 허용된 도메인 설정
  const allowedOrigins = [
    'http://localhost:3000',  // 로컬 개발 환경
    'https://studybbit.store' // 배포된 환경
  ];
  
  // Socket.io 설정
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ["GET", "POST", "DELETE"]
    }
  });

  // Middleware
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "DELETE"],
    credentials: true
  }));
  app.use(express.json());
  app.use(express.raw({ type: "application/webhook+json" }));

  // Routes
  app.use('/', livekitRoutes);
  app.use('/api/express/meetings', meetingRoutes);
  app.use('/', dbRoutes);

  // 요청 본문 데이터를 JSON으로 파싱
  app.use(bodyParser.json());

  // Socket 초기화
  initializeSocket(io);

  return { app, server };
};