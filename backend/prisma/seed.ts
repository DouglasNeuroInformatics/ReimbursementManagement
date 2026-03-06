/**
 * Development seed script — creates three test users:
 *
 *   admin@test.com      / Test1234!  → FINANCIAL_ADMIN
 *   supervisor@test.com / Test1234!  → SUPERVISOR  (reports to admin)
 *   user@test.com       / Test1234!  → USER        (reports to supervisor)
 *
 * Also creates billing accounts for the supervisor and admin.
 *
 * Idempotent: skips creation when admin@test.com already exists.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { hash } from "@node-rs/argon2";

const DATABASE_URL = Deno.env.get("DATABASE_URL");
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  Deno.exit(1);
}

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "Test1234!";

async function seed() {
  // Idempotency check
  const existing = await prisma.user.findUnique({
    where: { email: "admin@test.com" },
  });
  if (existing) {
    console.log("Seed data already exists — skipping.");
    return;
  }

  const passwordHash = await hash(PASSWORD);
  const now = new Date();

  // 1. Financial Admin
  const admin = await prisma.user.create({
    data: {
      email: "admin@test.com",
      passwordHash,
      firstName: "Alice",
      lastName: "Admin",
      role: "FINANCIAL_ADMIN",
      jobPosition: "Finance Director",
      updatedAt: now,
    },
  });
  console.log(`Created FINANCIAL_ADMIN: ${admin.email}`);

  // 2. Supervisor (reports to admin)
  const supervisor = await prisma.user.create({
    data: {
      email: "supervisor@test.com",
      passwordHash,
      firstName: "Sam",
      lastName: "Supervisor",
      role: "SUPERVISOR",
      supervisorId: admin.id,
      jobPosition: "Team Lead",
      updatedAt: now,
    },
  });
  console.log(`Created SUPERVISOR: ${supervisor.email}`);

  // 3. Regular user (reports to supervisor)
  const user = await prisma.user.create({
    data: {
      email: "user@test.com",
      passwordHash,
      firstName: "Uma",
      lastName: "User",
      role: "USER",
      supervisorId: supervisor.id,
      jobPosition: "Analyst",
      updatedAt: now,
    },
  });
  console.log(`Created USER: ${user.email}`);

  // 4. Billing accounts for the supervisor
  await prisma.supervisorAccount.createMany({
    data: [
      {
        supervisorId: supervisor.id,
        accountNumber: "4100-001",
        label: "Department Operations",
        updatedAt: now,
      },
      {
        supervisorId: supervisor.id,
        accountNumber: "4200-002",
        label: "Travel & Training",
        updatedAt: now,
      },
    ],
  });
  console.log("Created 2 billing accounts for supervisor");

  // 5. Billing account for the admin (so admin can also approve)
  await prisma.supervisorAccount.create({
    data: {
      supervisorId: admin.id,
      accountNumber: "1000-001",
      label: "Executive Budget",
      updatedAt: now,
    },
  });
  console.log("Created 1 billing account for admin");

  console.log("\n--- Dev seed complete ---");
  console.log(`  admin@test.com      / ${PASSWORD}  (FINANCIAL_ADMIN)`);
  console.log(`  supervisor@test.com / ${PASSWORD}  (SUPERVISOR)`);
  console.log(`  user@test.com       / ${PASSWORD}  (USER)`);
}

try {
  await seed();
} catch (err) {
  console.error("Seed failed:", err);
  Deno.exit(1);
} finally {
  await prisma.$disconnect();
}
