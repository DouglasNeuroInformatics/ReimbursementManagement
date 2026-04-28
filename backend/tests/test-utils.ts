/**
 * Test utilities for backend API tests
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role, type RequestType, type RequestStatus } from "../src/generated/prisma/client.ts";
import { hash } from "@node-rs/argon2";
import { signAccessToken } from "../src/lib/jwt.ts";
import app from "../main.ts";

const DATABASE_URL = Deno.env.get("DATABASE_URL");
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

/**
 * Test user types
 */
export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: Role;
  supervisorId: string | null;
  accessToken: string;
  refreshToken: string;
  cookieHeader: string;
}

import { initBucket } from "../src/lib/s3.ts";

/**
 * Clean all data from database (use with caution in tests)
 */
export async function cleanupDatabase(): Promise<void> {
  try { await initBucket(); } catch {}
  await prisma.approval.deleteMany();
  await prisma.document.deleteMany();
  await prisma.travelExpenseItem.deleteMany();
  await prisma.travelReimbursementDetail.deleteMany();
  await prisma.travelAdvanceItem.deleteMany();
  await prisma.travelAdvanceDetail.deleteMany();
  await prisma.reimbursementItem.deleteMany();
  await prisma.reimbursementDetail.deleteMany();
  await prisma.request.deleteMany();
  await prisma.supervisorAccount.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Create a test user with access and refresh tokens
 */
export async function createTestUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: Role = "USER",
  supervisorId?: string,
): Promise<TestUser> {
  const passwordHash = await hash(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      supervisorId,
    },
  });

  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = crypto.randomUUID();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.session.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
    },
  });

  const cookieHeader = `access_token=${accessToken}; refresh_token=${refreshToken}`;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    password,
    role: user.role,
    supervisorId: user.supervisorId,
    accessToken,
    refreshToken,
    cookieHeader,
  };
}

/**
 * Create test users for all roles
 */
export async function createTestUsers(): Promise<{
  admin: TestUser;
  supervisor: TestUser;
  user: TestUser;
}> {
  const admin = await createTestUser(
    "test-admin@example.com",
    "TestPass123!",
    "Admin",
    "User",
    "FINANCIAL_ADMIN",
  );

  const supervisor = await createTestUser(
    "test-supervisor@example.com",
    "TestPass123!",
    "Supervisor",
    "User",
    "SUPERVISOR",
    admin.id,
  );

  const user = await createTestUser(
    "test-user@example.com",
    "TestPass123!",
    "Regular",
    "User",
    "USER",
    supervisor.id,
  );

  return { admin, supervisor, user };
}

/**
 * Create a test request
 */
export async function createTestRequest(
  userId: string,
  type: RequestType,
  status: RequestStatus = "DRAFT",
  title?: string,
  details?: {
    reimbursement?: { items: Array<{ description: string; amount: number; date: Date; vendor?: string }> };
    travelAdvance?: {
      destination: string;
      purpose: string;
      departureDate: Date;
      returnDate: Date;
      estimatedAmount: number;
      items?: Array<{ category: string; amount: number; notes?: string }>;
    };
    travelReimbursement?: {
      destination: string;
      purpose: string;
      departureDate: Date;
      returnDate: Date;
      totalAmount: number;
      advanceRequestId?: string;
      items?: Array<{ date: Date; category: string; amount: number; vendor?: string }>;
    };
  },
) {
  const requestTitle = title || `Test ${type} Request`;

  const createData: any = {
    userId,
    type,
    status,
    title: requestTitle,
    description: "Test description",
  };

  if (type === "REIMBURSEMENT" && details?.reimbursement) {
    createData.reimbursement = {
      create: {
        items: {
          create: details.reimbursement.items.map((item) => ({
            description: item.description,
            amount: item.amount,
            date: item.date,
            vendor: item.vendor,
          })),
        },
      },
    };
  } else if (type === "TRAVEL_ADVANCE" && details?.travelAdvance) {
    createData.travelAdvance = {
      create: {
        destination: details.travelAdvance.destination,
        purpose: details.travelAdvance.purpose,
        departureDate: details.travelAdvance.departureDate,
        returnDate: details.travelAdvance.returnDate,
        estimatedAmount: details.travelAdvance.estimatedAmount,
        items: details.travelAdvance.items
          ? {
            create: details.travelAdvance.items.map((item) => ({
              category: item.category,
              amount: item.amount,
              notes: item.notes,
            })),
          }
          : undefined,
      },
    };
  } else if (type === "TRAVEL_REIMBURSEMENT" && details?.travelReimbursement) {
    createData.travelReimbursement = {
      create: {
        destination: details.travelReimbursement.destination,
        purpose: details.travelReimbursement.purpose,
        departureDate: details.travelReimbursement.departureDate,
        returnDate: details.travelReimbursement.returnDate,
        totalAmount: details.travelReimbursement.totalAmount,
        advanceRequestId: details.travelReimbursement.advanceRequestId,
        items: details.travelReimbursement.items
          ? {
            create: details.travelReimbursement.items.map((item) => ({
              date: item.date,
              category: item.category,
              amount: item.amount,
              vendor: item.vendor,
            })),
          }
          : undefined,
      },
    };
  }

  return await prisma.request.create({ data: createData });
}

/**
 * Create a supervisor account
 */
export async function createSupervisorAccount(
  supervisorId: string,
  accountNumber: string,
  label: string,
) {
  return await prisma.supervisorAccount.create({
    data: {
      supervisorId,
      accountNumber,
      label,
    },
  });
}

/**
 * Create an approval record
 */
export async function createApproval(
  requestId: string,
  actorId: string,
  action: "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "PAID",
  stage: "SUPERVISOR" | "FINANCE",
  comment?: string,
  accountId?: string,
) {
  return await prisma.approval.create({
    data: {
      requestId,
      actorId,
      action,
      stage,
      comment,
      accountId,
    },
  });
}

/**
 * Create a document
 */
export async function createDocument(
  requestId: string,
  filename: string,
  contentType: string,
  s3Key: string,
  uploadedById: string,
  reimbursementItemId?: string,
) {
  return await prisma.document.create({
    data: {
      request: { connect: { id: requestId } },
      filename,
      contentType,
      s3Key,
      uploadedBy: uploadedById,
      sizeBytes: 1024,
      ...(reimbursementItemId ? { reimbursementItem: { connect: { id: reimbursementItemId } } } : {}),
    },
  });
}

/**
 * Helper to make authenticated API requests
 */
export interface RequestOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: any;
  headers?: HeadersInit;
  cookieHeader?: string;
  skipCsrfHeader?: boolean;
  skipIpHeader?: boolean;
}

export interface SetCookieResult {
  accessToken?: string;
  refreshToken?: string;
  cookieHeader: string;
}

export function parseSetCookie(setCookieHeader: string | null): SetCookieResult {
  if (!setCookieHeader) {
    return { cookieHeader: "" };
  }

  const result: SetCookieResult = { cookieHeader: "" };
  const cookies = setCookieHeader.split(", ");

  for (const cookie of cookies) {
    if (cookie.includes("access_token=")) {
      const match = cookie.match(/access_token=([^;]+)/);
      if (match) {
        result.accessToken = match[1];
        result.cookieHeader += `access_token=${match[1]}; `;
      }
    }
    if (cookie.includes("refresh_token=")) {
      const match = cookie.match(/refresh_token=([^;]+)/);
      if (match) {
        result.refreshToken = match[1];
        result.cookieHeader += `refresh_token=${match[1]}; `;
      }
    }
  }

  result.cookieHeader = result.cookieHeader.trim();
  return result;
}

export async function makeRequest(
  baseUrl: string,
  options: RequestOptions,
): Promise<{ status: number; body: any; headers: Headers }> {
  const { method, path, body, headers, cookieHeader, skipCsrfHeader, skipIpHeader } = options;

  const requestHeaders = new Headers(headers);

  if (cookieHeader) {
    requestHeaders.set("Cookie", cookieHeader);
  }

  if (!skipIpHeader) {
    requestHeaders.set("X-Real-IP", `127.0.0.${Math.floor(Math.random() * 255)}`);
  }

  if (!skipCsrfHeader) {
    requestHeaders.set("X-Requested-With", "XMLHttpRequest");
  }

  if (body && method !== "GET") {
    if (!(body instanceof FormData)) {
      requestHeaders.set("Content-Type", "application/json");
    }
  }

  const url = `http://localhost/api${path}`;
  const response = await app.request(url, {
    method,
    headers: requestHeaders,
    body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
  });

  const responseBody = await response.text();
  let parsedBody;
  try {
    parsedBody = responseBody ? JSON.parse(responseBody) : null;
  } catch {
    parsedBody = responseBody;
  }

  if (response.status === 500) {
    console.error("500 Error:", parsedBody);
  }

  return {
    status: response.status,
    body: parsedBody,
    headers: response.headers,
  };
}

/**
 * Helper to create cookie header from tokens
 */
export function createCookieHeader(accessToken: string, refreshToken?: string): string {
  let cookieHeader = `access_token=${accessToken}`;
  if (refreshToken) {
    cookieHeader += `; refresh_token=${refreshToken}`;
  }
  return cookieHeader;
}

export async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
