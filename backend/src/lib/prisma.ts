import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { getEnv } from "./env.ts";

let _prisma: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (_prisma) return _prisma;
  const { DATABASE_URL } = getEnv();
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  _prisma = new PrismaClient({ adapter });
  return _prisma;
}

export const prisma = getPrisma();
