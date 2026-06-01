/**
 * Development seed script — creates five test users:
 *
 *   admin@test.com       / Test1234!  → FINANCIAL_ADMIN
 *   admin2@test.com      / Test1234!  → FINANCIAL_ADMIN
 *   admin3@test.com      / Test1234!  → FINANCIAL_ADMIN
 *   supervisor@test.com  / Test1234!  → SUPERVISOR  (reports to admin)
 *   user@test.com        / Test1234!  → USER        (reports to supervisor)
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
      preferredLocale: "en-CA",
      jobPosition: "Finance Director",
      updatedAt: now,
    },
  });
  console.log(`Created FINANCIAL_ADMIN: ${admin.email}`);

  // 1b. Second Financial Admin
  const admin2 = await prisma.user.create({
    data: {
      email: "admin2@test.com",
      passwordHash,
      firstName: "Bob",
      lastName: "Admin",
      role: "FINANCIAL_ADMIN",
      preferredLocale: "fr-CA",
      jobPosition: "Finance Manager",
      updatedAt: now,
    },
  });
  console.log(`Created FINANCIAL_ADMIN: ${admin2.email}`);

  // 1c. Third Financial Admin
  const admin3 = await prisma.user.create({
    data: {
      email: "admin3@test.com",
      passwordHash,
      firstName: "Carol",
      lastName: "Admin",
      role: "FINANCIAL_ADMIN",
      preferredLocale: "en-CA",
      jobPosition: "Finance Officer",
      updatedAt: now,
    },
  });
  console.log(`Created FINANCIAL_ADMIN: ${admin3.email}`);

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
                sortOrder: 0,
              },
              {
                description: "USB-C hub",
                amount: 35.5,
                date: new Date("2026-02-21"),
                vendor: "Best Buy",
                sortOrder: 1,
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
                sortOrder: 0,
              },
              {
                description: "Parking",
                amount: 25.0,
                date: new Date("2026-03-03"),
                vendor: "City Centre Parking",
                sortOrder: 1,
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
                sortOrder: 0,
              },
              {
                category: "Hotel",
                amount: 900.0,
                notes: "3 nights at conference hotel",
                sortOrder: 1,
              },
              {
                category: "Meals",
                amount: 450.0,
                notes: "Per diem $150/day",
                sortOrder: 2,
              },
              {
                category: "Conference Registration",
                amount: 950.0,
                notes: "Early bird ticket",
                sortOrder: 3,
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

  // 4. USER - FINANCE_REVIEWING General Reimbursement (1/3 finance signoffs, items unclassified)
  const financeReviewingReimbursement = await prisma.request.create({
    data: {
      userId: user.id,
      type: "REIMBURSEMENT",
      title: "Team Workshop Materials - March",
      description: "Printed materials and supplies for all-hands workshop",
      status: "FINANCE_REVIEWING",
      submittedAt: new Date("2026-03-01"),
      reimbursement: {
        create: {
          items: {
            create: [
              {
                description: "Printed workbooks (50 copies)",
                amount: 325.0,
                date: new Date("2026-02-28"),
                vendor: "Staples",
                sortOrder: 0,
              },
              {
                description: "Projector bulb replacement",
                amount: 189.0,
                date: new Date("2026-02-28"),
                vendor: "Best Buy",
                sortOrder: 1,
              },
              {
                description: "Whiteboard markers and erasers",
                amount: 45.75,
                date: new Date("2026-03-01"),
                vendor: "Staples",
                sortOrder: 2,
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
            comment: "Approved. Workshop is part of Q1 team development plan.",
            createdAt: new Date("2026-03-02"),
          },
          {
            actorId: admin.id,
            action: "APPROVE",
            stage: "FINANCE",
            comment: "First approval. Awaiting classification and remaining signoffs.",
            createdAt: new Date("2026-03-03"),
          },
        ],
      },
    },
  });
  console.log(
    `Created FINANCE_REVIEWING request: ${financeReviewingReimbursement.title} ($559.75)`,
  );

  // 5. USER - PAID General Reimbursement (fully completed workflow)
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
                codeSecondaire: "65030",
                sortOrder: 0,
              },
              {
                description: "Notion Business",
                amount: 96.0,
                date: new Date("2026-01-10"),
                vendor: "Notion Labs",
                codeSecondaire: "61795",
                sortOrder: 1,
              },
              {
                description: "Adobe Creative Cloud",
                amount: 659.88,
                date: new Date("2026-01-12"),
                vendor: "Adobe",
                codeSecondaire: "65030",
                sortOrder: 2,
              },
              {
                description: "AWS Educate",
                amount: 0.0,
                date: new Date("2026-01-12"),
                vendor: "Amazon Web Services",
                codeSecondaire: "61630",
                sortOrder: 3,
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
            actorId: admin2.id,
            action: "APPROVE",
            stage: "FINANCE",
            comment: "Second approval.",
            createdAt: new Date("2026-01-18"),
          },
          {
            actorId: admin3.id,
            action: "APPROVE",
            stage: "FINANCE",
            comment: "Third approval.",
            createdAt: new Date("2026-01-19"),
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

  // 6. SUPERVISOR - SUBMITTED Travel Reimbursement (awaiting supervisor review)
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
                sortOrder: 0,
              },
              {
                date: new Date("2026-03-04"),
                category: "Hotel",
                amount: 245.0,
                vendor: "Hilton Montreal",
                sortOrder: 1,
              },
              {
                date: new Date("2026-03-04"),
                category: "Meals",
                amount: 78.5,
                vendor: "La Banquise",
                sortOrder: 2,
              },
              {
                date: new Date("2026-03-05"),
                category: "Meals",
                amount: 92.0,
                vendor: "Joe Beef",
                sortOrder: 3,
              },
              {
                date: new Date("2026-03-05"),
                category: "Hotel",
                amount: 235.0,
                vendor: "Hilton Montreal",
                sortOrder: 4,
              },
              {
                date: new Date("2026-03-05"),
                category: "Ground Transport",
                amount: 200.0,
                vendor: "Uber",
                sortOrder: 5,
              },
              {
                date: new Date("2026-03-04"),
                category: "Parking",
                amount: 105.0,
                vendor: "Parcement Montreal",
                sortOrder: 6,
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

  // 7. SUPERVISOR - FINANCE_APPROVED General Reimbursement (awaiting payment)
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
                codeSecondaire: "66390",
                sortOrder: 0,
              },
              {
                description: "Activity supplies",
                amount: 67.5,
                date: new Date("2026-02-08"),
                vendor: "Costco",
                codeSecondaire: "64040",
                sortOrder: 1,
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
          {
            actorId: admin2.id,
            action: "APPROVE",
            stage: "FINANCE",
            comment: "Second approval.",
            createdAt: new Date("2026-02-12"),
          },
          {
            actorId: admin3.id,
            action: "APPROVE",
            stage: "FINANCE",
            comment: "Third approval.",
            createdAt: new Date("2026-02-13"),
          },
        ],
      },
    },
  });
  console.log(
    `Created FINANCE_APPROVED request: ${financeApprovedReimbursement.title} ($492.50)`,
  );

  // 8. FINANCIAL_ADMIN - SUPERVISOR_REJECTED Travel Advance (shows rejection)
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
                sortOrder: 0,
              },
              {
                category: "Hotel",
                amount: 1500.0,
                notes: "4 nights at Moscone area",
                sortOrder: 1,
              },
              {
                category: "Meals",
                amount: 600.0,
                notes: "Per diem $150/day",
                sortOrder: 2,
              },
              {
                category: "Conference Registration",
                amount: 1500.0,
                notes: "Full summit pass",
                sortOrder: 3,
              },
              {
                category: "Local Transport",
                amount: 100.0,
                notes: "BART and rideshare",
                sortOrder: 4,
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

  // 9. FINANCIAL_ADMIN - FINANCE_REJECTED General Reimbursement (shows finance rejection)
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
                sortOrder: 0,
              },
              {
                description: "USB-C Docking Station",
                amount: 199.99,
                date: new Date("2026-02-12"),
                vendor: "Dell",
                sortOrder: 1,
              },
              {
                description: "Wireless Keyboard & Mouse",
                amount: 129.99,
                date: new Date("2026-02-12"),
                vendor: "Logitech",
                sortOrder: 2,
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

  // 10. SUPERVISOR - PAID Travel Advance (will be the link target for request 11)
  const paidTravelAdvance = await prisma.request.create({
    data: {
      userId: supervisor.id,
      type: "TRAVEL_ADVANCE",
      title: "Research Summit 2025 - Toronto",
      description: "Advance for research summit attendance",
      status: "PAID",
      submittedAt: new Date("2025-10-01"),
      travelAdvance: {
        create: {
          destination: "Toronto, ON",
          purpose: "Attend annual research summit and present findings",
          departureDate: new Date("2025-11-10"),
          returnDate: new Date("2025-11-12"),
          estimatedAmount: 950.0,
          items: {
            create: [
              {
                category: "Airfare",
                amount: 450.0,
                notes: "Round trip Ottawa–Toronto",
                codeSecondaire: "66340",
                sortOrder: 0,
              },
              {
                category: "Hotel",
                amount: 320.0,
                notes: "2 nights",
                codeSecondaire: "66340",
                sortOrder: 1,
              },
              {
                category: "Meals",
                amount: 180.0,
                notes: "Per diem",
                codeSecondaire: "66340",
                sortOrder: 2,
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
            comment: "Approved for summit attendance.",
            createdAt: new Date("2025-10-03"),
          },
          {
            actorId: admin.id,
            action: "APPROVE",
            stage: "FINANCE",
            comment: "First finance approval.",
            createdAt: new Date("2025-10-05"),
          },
          {
            actorId: admin2.id,
            action: "APPROVE",
            stage: "FINANCE",
            comment: "Second finance approval.",
            createdAt: new Date("2025-10-05"),
          },
          {
            actorId: admin3.id,
            action: "APPROVE",
            stage: "FINANCE",
            comment: "Third finance approval.",
            createdAt: new Date("2025-10-06"),
          },
          {
            actorId: admin.id,
            action: "PAID",
            stage: "FINANCE",
            comment: "Advance issued. Reference: ADV-2025-0411",
            createdAt: new Date("2025-10-07"),
          },
        ],
      },
    },
  });
  console.log(
    `Created PAID request: ${paidTravelAdvance.title} ($950.00)`,
  );

  // 11. SUPERVISOR - SUBMITTED Travel Reimbursement linked to request 10
  const linkedTravelReimbursement = await prisma.request.create({
    data: {
      userId: supervisor.id,
      type: "TRAVEL_REIMBURSEMENT",
      title: "Research Summit 2025 - Actual Expenses",
      description: "Actual expenses for research summit — linked to prior advance",
      status: "SUBMITTED",
      submittedAt: new Date("2025-11-18"),
      travelReimbursement: {
        create: {
          destination: "Toronto, ON",
          purpose: "Attend annual research summit and present findings",
          departureDate: new Date("2025-11-10"),
          returnDate: new Date("2025-11-12"),
          totalAmount: 1012.50,
          advanceRequestId: paidTravelAdvance.id,
          items: {
            create: [
              {
                date: new Date("2025-11-10"),
                category: "Airfare",
                amount: 467.00,
                vendor: "Porter Airlines",
                sortOrder: 0,
              },
              {
                date: new Date("2025-11-10"),
                category: "Hotel",
                amount: 298.00,
                vendor: "Marriott Toronto",
                sortOrder: 1,
              },
              {
                date: new Date("2025-11-10"),
                category: "Meals",
                amount: 52.50,
                vendor: "Canoe Restaurant",
                sortOrder: 2,
              },
              {
                date: new Date("2025-11-11"),
                category: "Meals",
                amount: 18.00,
                vendor: "Tim Hortons",
                sortOrder: 3,
              },
              {
                date: new Date("2025-11-12"),
                category: "Ground Transport",
                amount: 177.00,
                vendor: "Porter shuttle + Uber",
                sortOrder: 4,
              },
            ],
          },
        },
      },
    },
  });
  console.log(
    `Created SUBMITTED request: ${linkedTravelReimbursement.title} ($1,012.50)`,
  );

  // 12. USER - FINANCE_REVIEWING (2/3 signoffs, partial classification)
  const financeReviewing2of3 = await prisma.request.create({
    data: {
      userId: user.id,
      type: "REIMBURSEMENT",
      title: "Lab Equipment Maintenance - Q1",
      description: "Preventive maintenance and consumables for lab equipment",
      status: "FINANCE_REVIEWING",
      submittedAt: new Date("2026-01-20"),
      reimbursement: {
        create: {
          items: {
            create: [
              {
                description: "Annual calibration service",
                amount: 850.00,
                date: new Date("2026-01-15"),
                vendor: "Precision Instruments Inc.",
                codeSecondaire: "61495",
                sortOrder: 0,
              },
              {
                description: "Replacement sensors (pack of 10)",
                amount: 320.00,
                date: new Date("2026-01-15"),
                vendor: "Lab Supply Co.",
                sortOrder: 1,
              },
              {
                description: "Safety inspection fee",
                amount: 150.00,
                date: new Date("2026-01-16"),
                vendor: "SafeCheck Services",
                codeSecondaire: "61495",
                sortOrder: 2,
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
            comment: "Approved. Maintenance is scheduled and necessary.",
            createdAt: new Date("2026-01-22"),
          },
          {
            actorId: admin.id,
            action: "APPROVE",
            stage: "FINANCE",
            comment: "First finance approval.",
            createdAt: new Date("2026-01-23"),
          },
          {
            actorId: admin2.id,
            action: "APPROVE",
            stage: "FINANCE",
            comment: "Second finance approval. Awaiting final signoff.",
            createdAt: new Date("2026-01-24"),
          },
        ],
      },
    },
  });
  console.log(
    `Created FINANCE_REVIEWING (2/3) request: ${financeReviewing2of3.title} ($1,320.00)`,
  );

  console.log("\n--- Dev seed complete ---");
  if (Deno.env.get("DEMO_MODE") === "true") {
    console.log(`  admin@test.com       / ${PASSWORD}  (FINANCIAL_ADMIN)`);
    console.log(`  admin2@test.com      / ${PASSWORD}  (FINANCIAL_ADMIN)`);
    console.log(`  admin3@test.com      / ${PASSWORD}  (FINANCIAL_ADMIN)`);
    console.log(`  supervisor@test.com  / ${PASSWORD}  (SUPERVISOR)`);
    console.log(`  user@test.com        / ${PASSWORD}  (USER)`);
  }
}

try {
  await seed();
} catch (err) {
  console.error("Seed failed:", err);
  Deno.exit(1);
} finally {
  await prisma.$disconnect();
}
