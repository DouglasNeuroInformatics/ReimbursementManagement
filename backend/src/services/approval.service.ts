import { prisma } from "../lib/prisma.ts";
import { AppError } from "../middleware/error.ts";

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

  await prisma.$transaction([
    prisma.request.update({
      where: { id: requestId },
      data: { status: "SUPERVISOR_APPROVED" },
    }),
    prisma.approval.create({
      data: {
        requestId,
        actorId: supervisorId,
        action: "APPROVE",
        stage: "SUPERVISOR",
        accountId,
        comment: comment ?? null,
      },
    }),
  ]);

  return prisma.request.findUnique({
    where: { id: requestId },
    include: {
      approvals: {
        include: {
          actor: { select: { id: true, firstName: true, lastName: true } },
          account: { select: { id: true, accountNumber: true, label: true } },
        },
      },
    },
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

  await prisma.$transaction([
    prisma.request.update({
      where: { id: requestId },
      data: { status: "SUPERVISOR_REJECTED" },
    }),
    prisma.approval.create({
      data: {
        requestId,
        actorId: supervisorId,
        action: "REJECT",
        stage: "SUPERVISOR",
        comment: comment ?? null,
      },
    }),
  ]);
}

export async function financeApprove(
  requestId: string,
  adminId: string,
  comment?: string,
) {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError(404, "Request not found");
  if (request.status !== "SUPERVISOR_APPROVED") {
    throw new AppError(400, `Cannot approve request with status: ${request.status}`);
  }
  await prisma.$transaction([
    prisma.request.update({
      where: { id: requestId },
      data: { status: "FINANCE_APPROVED" },
    }),
    prisma.approval.create({
      data: {
        requestId,
        actorId: adminId,
        action: "APPROVE",
        stage: "FINANCE",
        comment: comment ?? null,
      },
    }),
  ]);
}

export async function financeReject(
  requestId: string,
  adminId: string,
  comment?: string,
) {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError(404, "Request not found");
  if (request.status !== "SUPERVISOR_APPROVED") {
    throw new AppError(400, `Cannot reject request with status: ${request.status}`);
  }
  await prisma.$transaction([
    prisma.request.update({
      where: { id: requestId },
      data: { status: "FINANCE_REJECTED" },
    }),
    prisma.approval.create({
      data: {
        requestId,
        actorId: adminId,
        action: "REJECT",
        stage: "FINANCE",
        comment: comment ?? null,
      },
    }),
  ]);
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
  await prisma.$transaction([
    prisma.request.update({
      where: { id: requestId },
      data: { status: "PAID" },
    }),
    prisma.approval.create({
      data: {
        requestId,
        actorId: adminId,
        action: "PAID",
        stage: "FINANCE",
        comment: comment ?? null,
      },
    }),
  ]);
}
