import { PrismaClient } from '@prisma/client';
import { assertRuntimeDatabaseSafety } from './database-safety';

assertRuntimeDatabaseSafety(process.env);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn']
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
