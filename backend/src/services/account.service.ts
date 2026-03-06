import { prisma } from "../lib/prisma.ts";
import { AppError } from "../middleware/error.ts";

export async function getAccounts(supervisorId: string) {
  const supervisor = await prisma.user.findUnique({ where: { id: supervisorId } });
  if (!supervisor) throw new AppError(404, "Supervisor not found");
  return prisma.supervisorAccount.findMany({
    where: { supervisorId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getActiveAccounts(supervisorId: string) {
  return prisma.supervisorAccount.findMany({
    where: { supervisorId, isActive: true },
    orderBy: { label: "asc" },
  });
}

export async function createAccount(
  supervisorId: string,
  data: { accountNumber: string; label: string },
) {
  const supervisor = await prisma.user.findUnique({ where: { id: supervisorId } });
  if (!supervisor) throw new AppError(404, "Supervisor not found");
  if (!(["SUPERVISOR", "FINANCIAL_ADMIN"] as string[]).includes(supervisor.role)) {
    throw new AppError(400, "Target user does not have a supervisor role");
  }

  const existing = await prisma.supervisorAccount.findFirst({
    where: { supervisorId, accountNumber: data.accountNumber },
  });
  if (existing) {
    if (existing.isActive) {
      throw new AppError(409, "Account number already exists for this supervisor");
    }
    return prisma.supervisorAccount.update({
      where: { id: existing.id },
      data: { isActive: true, label: data.label },
    });
  }

  return prisma.supervisorAccount.create({
    data: { supervisorId, accountNumber: data.accountNumber, label: data.label },
  });
}

export async function updateAccount(
  supervisorId: string,
  accountId: string,
  data: { accountNumber?: string; label?: string; isActive?: boolean },
) {
  const account = await prisma.supervisorAccount.findFirst({
    where: { id: accountId, supervisorId },
  });
  if (!account) throw new AppError(404, "Account not found");

  if (data.accountNumber && data.accountNumber !== account.accountNumber) {
    const conflict = await prisma.supervisorAccount.findFirst({
      where: { supervisorId, accountNumber: data.accountNumber, id: { not: accountId } },
    });
    if (conflict) throw new AppError(409, "Account number already exists for this supervisor");
  }

  return prisma.supervisorAccount.update({
    where: { id: accountId },
    data: {
      ...(data.accountNumber !== undefined ? { accountNumber: data.accountNumber } : {}),
      ...(data.label !== undefined ? { label: data.label } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
}

export async function deactivateAccount(
  supervisorId: string,
  accountId: string,
) {
  const account = await prisma.supervisorAccount.findFirst({
    where: { id: accountId, supervisorId },
  });
  if (!account) throw new AppError(404, "Account not found");
  return prisma.supervisorAccount.update({
    where: { id: accountId },
    data: { isActive: false },
  });
}
