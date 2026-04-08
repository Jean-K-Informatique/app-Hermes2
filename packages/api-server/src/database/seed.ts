/**
 * Seed script for development.
 * Creates a test tenant and user.
 *
 * Run: npx tsx src/database/seed.ts
 */
import { config } from 'dotenv';
config();

import { v4 as uuidv4 } from 'uuid';
import { db } from './connection.js';
import { tenants, users } from './schema.js';
import { hashPassword } from '../services/authService.js';
import { encryptApiKey } from '../services/hermesProxy.js';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database...');

  const tenantId = uuidv4();
  const userId = uuidv4();

  // Check if demo tenant already exists
  const [existing] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, 'demo'))
    .limit(1);

  if (existing) {
    console.log('Demo tenant already exists, skipping seed.');
    return;
  }

  // Create demo tenant
  await db.insert(tenants).values({
    id: tenantId,
    name: 'Demo Company',
    slug: 'demo',
    hermesApiUrl: 'http://localhost:8000',
    hermesApiKey: 'mock-api-key', // In dev with MOCK_HERMES=true, this is fine
    brandingConfig: {
      appName: 'HermesChat Demo',
      primaryColor: '#6366F1',
      logoUrl: undefined,
    },
    maxUsers: 100,
    isActive: true,
  });

  // Create demo user
  const passwordHash = await hashPassword('demo1234');
  await db.insert(users).values({
    id: userId,
    tenantId,
    email: 'demo@example.com',
    passwordHash,
    displayName: 'Demo User',
    isActive: true,
  });

  console.log('Seed complete!');
  console.log('  Tenant: demo');
  console.log('  Email: demo@example.com');
  console.log('  Password: demo1234');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
