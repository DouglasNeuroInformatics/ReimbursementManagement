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

  // Fetch account IDs for use in approvals
  const supervisorAccounts = await prisma.supervisorAccount.findMany({
    where: { supervisorId: supervisor.id },
  });
  const adminAccounts = await prisma.supervisorAccount.findMany({
    where: { supervisorId: admin.id },
  });
  const supervisorAccount1 = supervisorAccounts[0];
  const adminAccount1 = adminAccounts[0];

  // ---------------------------------------------------------------------------
  // EXAMPLE REQUESTS AT VARIOUS WORKFLOW STAGES
  // ---------------------------------------------------------------------------

  // 1. USER - DRAFT General Reimbursement (incomplete, not submitted)
  const draftReimbursement = await prisma.request.create({
    data: {
      userId: user.id,
      type: "REIMBURSEMENT",
      title: "Q1 Office Supplies - Incomplete",
      description: "Office supplies for team project - still gathering receipts",
      status: "DRAFT",
      reimbursement: {
        create: {
          items: {
            create: [
              {
                description: "Ergonomic chair cushion",
                amount: 45.0,
                date: new Date("2026-02-20"),
                vendor: "Staples",
              },
              {
                description: "USB-C hub",
                amount: 35.5,
                date: new Date("2026-02-21"),
                vendor: "Best Buy",
              },
            ],
          },
        },
      },
    },
  });
  console.log(
    `Created DRAFT request: ${draftReimbursement.title} ($80.50)`,
  );

  // 2. USER - SUBMITTED General Reimbursement (awaiting supervisor review)
  const submittedReimbursement = await prisma.request.create({
    data: {
      userId: user.id,
      type: "REIMBURSEMENT",
      title: "Client Entertainment - February",
      description: "Team building dinner with new client from Toronto",
      status: "SUBMITTED",
      submittedAt: new Date("2026-03-05"),
      reimbursement: {
        create: {
          items: {
            create: [
              {
                description: "Client dinner at The Keg",
                amount: 185.0,
                date: new Date("2026-03-03"),
                vendor: "The Keg Steakhouse",
              },
              {
                description: "Parking",
                amount: 25.0,
                date: new Date("2026-03-03"),
                vendor: "City Centre Parking",
              },
            ],
          },
        },
      },
    },
  });
  console.log(
    `Created SUBMITTED request: ${submittedReimbursement.title} ($210.00)`,
  );

  // 3. USER - SUPERVISOR_APPROVED Travel Advance (awaiting finance approval)
  const travelAdvance = await prisma.request.create({
    data: {
      userId: user.id,
      type: "TRAVEL_ADVANCE",
      title: "Tech Conference 2026 - Vancouver",
      description:
        "Annual developer conference - presenting on Deno best practices",
      status: "SUPERVISOR_APPROVED",
      submittedAt: new Date("2026-02-20"),
      travelAdvance: {
        create: {
          destination: "Vancouver, BC",
          purpose: "Present on Deno runtime at TechConf 2026",
          departureDate: new Date("2026-03-25"),
          returnDate: new Date("2026-03-28"),
          estimatedAmount: 3500.0,
          items: {
            create: [
              {
                category: "Airfare",
                amount: 1200.0,
                notes: "Round trip from Ottawa",
              },
              {
                category: "Hotel",
                amount: 900.0,
                notes: "3 nights at conference hotel",
              },
              {
                category: "Meals",
                amount: 450.0,
                notes: "Per diem $150/day",
              },
              {
                category: "Conference Registration",
                amount: 950.0,
                notes: "Early bird ticket",
              },
            ],
          },
        },
      },
      approvals: {
        create: {
          actorId: supervisor.id,
          action: "APPROVE",
          stage: "SUPERVISOR",
          accountId: supervisorAccount1.id,
          comment: "Approved. Please submit actual expenses after trip.",
          createdAt: new Date("2026-02-22"),
        },
      },
    },
  });
  console.log(
    `Created SUPERVISOR_APPROVED request: ${travelAdvance.title} ($3,500.00)`,
  );

  // 4. USER - PAID General Reimbursement (fully completed workflow)
  const paidReimbursement = await prisma.request.create({
    data: {
      userId: user.id,
      type: "REIMBURSEMENT",
      title: "Q4 Software Licenses",
      description: "Annual subscriptions for development tools",
      status: "PAID",
      submittedAt: new Date("2026-01-15"),
      reimbursement: {
        create: {
          items: {
            create: [
              {
                description: "GitHub Pro annual",
                amount: 48.0,
                date: new Date("2026-01-10"),
                vendor: "GitHub",
              },
              {
                description: "Notion Business",
                amount: 96.0,
                date: new Date("2026-01-10"),
                vendor: "Notion Labs",
              },
              {
                description: "Adobe Creative Cloud",
                amount: 659.88,
                date: new Date("2026-01-12"),
                vendor: "Adobe",
              },
              {
                description: "AWS Educate",
                amount: 0.0,
                date: new Date("2026-01-12"),
                vendor: "Amazon Web Services",
              },
            ],
          },
        },
      },
      approvals: {
        create: [
          {
            actorId: supervisor.id,
            action: "APPROVE",
            stage: "SUPERVISOR",
            accountId: supervisorAccount1.id,
            comment: "All receipts verified. Approved.",
            createdAt: new Date("2026-01-17"),
          },
          {
            actorId: admin.id,
            action: "APPROVE",
            stage: "FINANCE",
            comment: "Approved for payment. Invoice #INV-2026-0089",
            createdAt: new Date("2026-01-18"),
          },
          {
            actorId: admin.id,
            action: "PAID",
            stage: "FINANCE",
            comment: "Paid via wire transfer. Reference: WIRE-2026-0145",
            createdAt: new Date("2026-01-20"),
          },
        ],
      },
    },
  });
  console.log(
    `Created PAID request: ${paidReimbursement.title} ($803.88)`,
  );

  // 5. SUPERVISOR - SUBMITTED Travel Reimbursement (awaiting supervisor review)
  const supervisorTravelReimbursement = await prisma.request.create({
    data: {
      userId: supervisor.id,
      type: "TRAVEL_REIMBURSEMENT",
      title: "Client Site Visit - Montreal",
      description: "On-site consultation for Acme Corp implementation",
      status: "SUBMITTED",
      submittedAt: new Date("2026-03-06"),
      travelReimbursement: {
        create: {
          destination: "Montreal, QC",
          purpose: "Client implementation review and training",
          departureDate: new Date("2026-03-04"),
          returnDate: new Date("2026-03-05"),
          totalAmount: 1245.5,
          items: {
            create: [
              {
                date: new Date("2026-03-04"),
                category: "Airfare",
                amount: 385.0,
                vendor: "Air Canada",
              },
              {
                date: new Date("2026-03-04"),
                category: "Hotel",
                amount: 245.0,
                vendor: "Hilton Montreal",
              },
              {
                date: new Date("2026-03-04"),
                category: "Meals",
                amount: 78.5,
                vendor: "La Banquise",
              },
              {
                date: new Date("2026-03-05"),
                category: "Meals",
                amount: 92.0,
                vendor: "Joe Beef",
              },
              {
                date: new Date("2026-03-05"),
                category: "Hotel",
                amount: 235.0,
                vendor: "Hilton Montreal",
              },
              {
                date: new Date("2026-03-05"),
                category: "Ground Transport",
                amount: 200.0,
                vendor: "Uber",
              },
              {
                date: new Date("2026-03-04"),
                category: "Parking",
                amount: 105.0,
                vendor: "Parcement Montreal",
              },
            ],
          },
        },
      },
    },
  });
  console.log(
    `Created SUBMITTED request: ${supervisorTravelReimbursement.title} ($1,245.50)`,
  );

  // 6. SUPERVISOR - FINANCE_APPROVED General Reimbursement (awaiting payment)
  const financeApprovedReimbursement = await prisma.request.create({
    data: {
      userId: supervisor.id,
      type: "REIMBURSEMENT",
      title: "Team Building Event - February",
      description: "Monthly team lunch and activities",
      status: "FINANCE_APPROVED",
      submittedAt: new Date("2026-02-10"),
      reimbursement: {
        create: {
          items: {
            create: [
              {
                description: "Team lunch at C'est quoi la vie",
                amount: 425.0,
                date: new Date("2026-02-08"),
                vendor: "C'est quoi la vie",
              },
              {
                description: "Activity supplies",
                amount: 67.5,
                date: new Date("2026-02-08"),
                vendor: "Costco",
              },
            ],
          },
        },
      },
      approvals: {
        create: [
          {
            actorId: admin.id,
            action: "APPROVE",
            stage: "SUPERVISOR",
            accountId: adminAccount1.id,
            comment: "Approved. Team building is a valid business expense.",
            createdAt: new Date("2026-02-11"),
          },
          {
            actorId: admin.id,
            action: "APPROVE",
            stage: "FINANCE",
            comment: "Approved for payment. Reference: PAY-2026-0210",
            createdAt: new Date("2026-02-12"),
          },
        ],
      },
    },
  });
  console.log(
    `Created FINANCE_APPROVED request: ${financeApprovedReimbursement.title} ($492.50)`,
  );

  // 7. FINANCIAL_ADMIN - SUPERVISOR_REJECTED Travel Advance (shows rejection)
  const supervisorRejectedAdvance = await prisma.request.create({
    data: {
      userId: admin.id,
      type: "TRAVEL_ADVANCE",
      title: "Industry Summit 2026 - San Francisco",
      description: "Annual fintech summit and networking event",
      status: "SUPERVISOR_REJECTED",
      submittedAt: new Date("2026-02-25"),
      travelAdvance: {
        create: {
          destination: "San Francisco, CA",
          purpose: "Attend FinTech Summit 2026 and represent company",
          departureDate: new Date("2026-04-10"),
          returnDate: new Date("2026-04-13"),
          estimatedAmount: 5500.0,
          items: {
            create: [
              {
                category: "Airfare",
                amount: 1800.0,
                notes: "Round trip from Ottawa",
              },
              {
                category: "Hotel",
                amount: 1500.0,
                notes: "4 nights at Moscone area",
              },
              {
                category: "Meals",
                amount: 600.0,
                notes: "Per diem $150/day",
              },
              {
                category: "Conference Registration",
                amount: 1500.0,
                notes: "Full summit pass",
              },
              {
                category: "Local Transport",
                amount: 100.0,
                notes: "BART and rideshare",
              },
            ],
          },
        },
      },
      approvals: {
        create: {
          actorId: supervisor.id,
          action: "REJECT",
          stage: "SUPERVISOR",
          comment:
            "Budget exceeds Q2 allocation. Please revise with revised budget justification or wait for Q3 planning.",
          createdAt: new Date("2026-02-26"),
        },
      },
    },
  });
  console.log(
    `Created SUPERVISOR_REJECTED request: ${supervisorRejectedAdvance.title} ($5,500.00)`,
  );

  // 8. FINANCIAL_ADMIN - FINANCE_REJECTED General Reimbursement (shows finance rejection)
  const financeRejectedReimbursement = await prisma.request.create({
    data: {
      userId: admin.id,
      type: "REIMBURSEMENT",
      title: "Office Equipment - Q1",
      description: "Monitor and accessories for home office setup",
      status: "FINANCE_REJECTED",
      submittedAt: new Date("2026-02-15"),
      reimbursement: {
        create: {
          items: {
            create: [
              {
                description: "Dell UltraSharp 27\" Monitor",
                amount: 549.99,
                date: new Date("2026-02-12"),
                vendor: "Dell",
              },
              {
                description: "USB-C Docking Station",
                amount: 199.99,
                date: new Date("2026-02-12"),
                vendor: "Dell",
              },
              {
                description: "Wireless Keyboard & Mouse",
                amount: 129.99,
                date: new Date("2026-02-12"),
                vendor: "Logitech",
              },
            ],
          },
        },
      },
      approvals: {
        create: [
          {
            actorId: supervisor.id,
            action: "APPROVE",
            stage: "SUPERVISOR",
            accountId: adminAccount1.id,
            comment: "Approved. Equipment needed for remote work.",
            createdAt: new Date("2026-02-16"),
          },
          {
            actorId: admin.id,
            action: "REJECT",
            stage: "FINANCE",
            comment:
              "Rejected. Home office equipment requires pre-approval from IT department. Please submit IT asset request first.",
            createdAt: new Date("2026-02-17"),
          },
        ],
      },
    },
  });
  console.log(
    `Created FINANCE_REJECTED request: ${financeRejectedReimbursement.title} ($879.97)`,
  );

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
