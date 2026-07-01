// drizzle-kit config — uses .mts extension so it always loads as native ESM,
// regardless of the package.json `type` field. This avoids the CJS resolver
// failing on `.js → .ts` import specifiers in the schema barrel.
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL must be set for drizzle-kit');

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});