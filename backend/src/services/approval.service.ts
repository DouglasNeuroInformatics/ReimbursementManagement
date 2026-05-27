import { prisma } from "../lib/prisma.ts";
import { AppError } from "../middleware/error.ts";
import { getEnv } from "../lib/env.ts";
import { allItemsClassified } from "./classification.service.ts";
import type { RequestStatus } from "../generated/prisma/client.ts";

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

type Verb = "approve" | "reject";

function assertSupervisorStageActionable(status: RequestStatus, verb: Verb): void {
  if (status !== "SUBMITTED") {
    throw new AppError(400, `Cannot ${verb} request with status: ${status}`);
  }
}

function assertFinanceStageActionable(status: RequestStatus, verb: Verb): void {
  if (status !== "SUPERVISOR_APPROVED" && status !== "FINANCE_REVIEWING") {
    throw new AppError(400, `Cannot ${verb} request with status: ${status}`);
  }
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
  assertSupervisorStageActionable(request.status, "approve");
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
  assertSupervisorStageActionable(request.status, "reject");
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
  const required = getRequiredApprovals();

  return prisma.$transaction(async (tx) => {
    // Serialize concurrent approvers on the same request. Without this lock,
    // two admins racing on the final signoff can both observe count = N-1 and
    // both decide they are the finalizer (or neither does), producing the
    // wrong final status or count.
    const locked = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT id, status FROM "Request" WHERE id = ${requestId} FOR UPDATE
    `;
    if (locked.length === 0) throw new AppError(404, "Request not found");
    assertFinanceStageActionable(locked[0].status as RequestStatus, "approve");

    const existing = await tx.approval.findMany({
      where: { requestId, stage: "FINANCE", action: "APPROVE" },
      select: { actorId: true },
      distinct: ["actorId"],
    });
    if (existing.some((a) => a.actorId === adminId)) {
      throw new AppError(400, "You have already approved this request");
    }

    const willBeFullyApproved = existing.length + 1 >= required;
    if (willBeFullyApproved) {
      const classified = await allItemsClassified(requestId, tx);
      if (!classified) {
        throw new AppError(
          400,
          "All items must be classified with a code secondaire before final approval",
        );
      }
    }

    await tx.request.update({
      where: { id: requestId },
      data: { status: willBeFullyApproved ? "FINANCE_APPROVED" : "FINANCE_REVIEWING" },
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
  assertFinanceStageActionable(request.status, "reject");

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
