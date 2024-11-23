import { config } from './src/config/env.js';
import pg from 'pg';

const { Pool } = pg;

// PostgreSQL 연결 설정
export const pool = new Pool({
    user: config.POSTGRES_USER,
    host: config.POSTGRES_HOST,
    database: config.POSTGRES_DB,
    password: config.POSTGRES_PASSWORD,
    port: config.POSTGRES_PORT
});