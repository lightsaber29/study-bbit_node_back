import dotenv from 'dotenv';
dotenv.config(); // .env 파일 로드

export const config = {
    SERVER_PORT: process.env.SERVER_PORT,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
    LIVEKIT_URL: process.env.LIVEKIT_URL,
    CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",

    POSTGRES_HOST: process.env.POSTGRES_HOST,
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    POSTGRES_DB: process.env.POSTGRES_DB,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,

    SPRING_BOOT_URL: process.env.SPRING_BOOT_URL
  };
  
