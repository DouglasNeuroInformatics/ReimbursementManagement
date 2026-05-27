import { prisma } from "../lib/prisma.ts";
import { AppError } from "../middleware/error.ts";
import { getEnv } from "../lib/env.ts";
import { allItemsClassified } from "./classification.service.ts";

const approvalInclude = {
  approvals: {
    include: {
      actor: { select: { id: true, firstName: true, lastName: true } },
      account: { select: { id: true, accountNumber: true, label: true } },
    },
  },
} as const;

function getRequiredApprovals(): number {
  return getEnv().REQUIRED_FINANCE_APPROVALS;
}

async function getDistinctFinanceApprovals(requestId: string): Promise<string[]> {
  const approvals = await prisma.approval.findMany({
    where: {
      requestId,
      stage: "FINANCE",
      action: "APPROVE",
    },
    select: { actorId: true },
    distinct: ["actorId"],
  });
  return approvals.map((a) => a.actorId);
}

export async function supervisorApprove(
  requestId: string,
  supervisorId: string,
  accountId: string,
  comment?: string,
  actorRole: "USER" | "SUPERVISOR" | "FINANCIAL_ADMIN" = "SUPERVISOR",
) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { user: { select: { supervisorId: true } } },
  });
  if (!request) throw new AppError(404, "Request not found");
  if (request.status !== "SUBMITTED") {
    throw new AppError(400, `Cannot approve request with status: ${request.status}`);
  }
  if (request.user.supervisorId && request.user.supervisorId !== supervisorId && actorRole !== "FINANCIAL_ADMIN") {
    throw new AppError(403, "This request is assigned to a different supervisor");
  }

  const account = await prisma.supervisorAccount.findFirst({
    where: { id: accountId, supervisorId },
  });
  if (!account) {
    throw new AppError(400, "Account not found for this supervisor");
  }
  if (!account.isActive) {
    throw new AppError(400, "Selected account is inactive");
  }

  return prisma.$transaction(async (tx) => {
    await tx.request.update({
      where: { id: requestId },
      data: { status: "SUPERVISOR_APPROVED" },
    });
    await tx.approval.create({
      data: {
        requestId,
        actorId: supervisorId,
        action: "APPROVE",
        stage: "SUPERVISOR",
        accountId,
        comment: comment ?? null,
      },
    });
    return tx.request.findUnique({
      where: { id: requestId },
      include: approvalInclude,
    });
  });
}

export async function supervisorReject(
  requestId: string,
  supervisorId: string,
  comment?: string,
  actorRole: "USER" | "SUPERVISOR" | "FINANCIAL_ADMIN" = "SUPERVISOR",
) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { user: { select: { supervisorId: true } } },
  });
  if (!request) throw new AppError(404, "Request not found");
  if (request.status !== "SUBMITTED") {
    throw new AppError(400, `Cannot reject request with status: ${request.status}`);
  }
  if (request.user.supervisorId && request.user.supervisorId !== supervisorId && actorRole !== "FINANCIAL_ADMIN") {
    throw new AppError(403, "This request is assigned to a different supervisor");
  }

  return prisma.$transaction(async (tx) => {
    await tx.request.update({
      where: { id: requestId },
      data: { status: "SUPERVISOR_REJECTED" },
    });
    await tx.approval.create({
      data: {
        requestId,
        actorId: supervisorId,
        action: "REJECT",
        stage: "SUPERVISOR",
        comment: comment ?? null,
      },
    });
    return tx.request.findUnique({
      where: { id: requestId },
      include: approvalInclude,
    });
  });
}

export async function financeApprove(
  requestId: string,
  adminId: string,
  comment?: string,
) {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError(404, "Request not found");

  if (
    request.status !== "SUPERVISOR_APPROVED" &&
    request.status !== "FINANCE_REVIEWING"
  ) {
    throw new AppError(400, `Cannot approve request with status: ${request.status}`);
  }

  const existingApproverIds = await getDistinctFinanceApprovals(requestId);
  if (existingApproverIds.includes(adminId)) {
    throw new AppError(400, "You have already approved this request");
  }

  const required = getRequiredApprovals();
  const newCount = existingApproverIds.length + 1;

  const willBeFullyApproved = newCount >= required;

  if (willBeFullyApproved) {
    const classified = await allItemsClassified(requestId);
    if (!classified) {
      throw new AppError(
        400,
        "All items must be classified with a code secondaire before final approval",
      );
    }
  }

  const newStatus = willBeFullyApproved ? "FINANCE_APPROVED" : "FINANCE_REVIEWING";

  return prisma.$transaction(async (tx) => {
    await tx.request.update({
      where: { id: requestId },
      data: { status: newStatus },
    });
    await tx.approval.create({
      data: {
        requestId,
        actorId: adminId,
        action: "APPROVE",
        stage: "FINANCE",
        comment: comment ?? null,
      },
    });
    return tx.request.findUnique({
      where: { id: requestId },
      include: approvalInclude,
    });
  });
}

export async function financeReject(
  requestId: string,
  adminId: string,
  comment?: string,
) {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError(404, "Request not found");

  if (
    request.status !== "SUPERVISOR_APPROVED" &&
    request.status !== "FINANCE_REVIEWING"
  ) {
    throw new AppError(400, `Cannot reject request with status: ${request.status}`);
  }

  return prisma.$transaction(async (tx) => {
    await tx.request.update({
      where: { id: requestId },
      data: { status: "FINANCE_REJECTED" },
    });
    await tx.approval.create({
      data: {
        requestId,
        actorId: adminId,
        action: "REJECT",
        stage: "FINANCE",
        comment: comment ?? null,
      },
    });
    return tx.request.findUnique({
      where: { id: requestId },
      include: approvalInclude,
    });
  });
}

export async function markPaid(
  requestId: string,
  adminId: string,
  comment?: string,
) {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError(404, "Request not found");
  if (request.status !== "FINANCE_APPROVED") {
    throw new AppError(400, `Cannot mark paid request with status: ${request.status}`);
  }
  return prisma.$transaction(async (tx) => {
    await tx.request.update({
      where: { id: requestId },
      data: { status: "PAID" },
    });
    await tx.approval.create({
      data: {
        requestId,
        actorId: adminId,
        action: "PAID",
        stage: "FINANCE",
        comment: comment ?? null,
      },
    });
    return tx.request.findUnique({
      where: { id: requestId },
      include: approvalInclude,
    });
  });
}
