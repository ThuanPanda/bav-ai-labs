import { loadEnv } from '@prowerbdigital/common';
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

loadEnv('api');

export default defineConfig({
  dialect: 'postgresql',
  schema: './libs/database/src/schemas/index.ts',
  out: './drizzle/migrations',
  dbCredentials: { url: process.env.DATABASE_URL! },
  verbose: true,
  strict: true,
});
