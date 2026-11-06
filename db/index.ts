import 'server-only';

import { drizzle } from 'drizzle-orm/mysql2';
import { createPool } from 'mysql2/promise';

import { env } from '@/lib/env';

const pool = createPool(env.DATABASE_URL);

export const db = drizzle({ client: pool, casing: 'snake_case', mode: 'default' });
