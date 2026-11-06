import { defineConfig } from 'drizzle-kit';

// D5: ferramenta de configuração lê process.env direto e carrega o .env.local sozinha.
process.loadEnvFile('.env.local');

export default defineConfig({
  dialect: 'mysql',
  schema: './db/schema',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
