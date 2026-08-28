import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://guilliman_user:guilliman_secret@localhost:5434/guilliman_db?schema=public';

export default defineConfig({
  datasource: {
    url: databaseUrl,
  },
});
