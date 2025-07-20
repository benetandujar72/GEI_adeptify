import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config();

export default defineConfig({
  schema: './shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://gei_user:gei_password@localhost:5432/gei_unified',
  },
  verbose: true,
  strict: true,
  migrations: {
    table: 'drizzle_migrations',
    schema: 'public',
  },
  driver: 'pg',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://gei_user:gei_password@localhost:5432/gei_unified',
  },
}); 