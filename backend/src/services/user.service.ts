import { prisma } from "../lib/prisma.ts";
import { AppError } from "../middleware/error.ts";
import type { Role } from "../generated/prisma/client.ts";

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  supervisorId: true,
  supervisor: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  createdAt: true,
} as const;

const USER_UPDATE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  supervisorId: true,
  supervisor: { select: { id: true, firstName: true, lastName: true } },
  updatedAt: true,
} as const;

export async function listUsers() {
  return prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { createdAt: "asc" },
  });
}

export async function updateUser(
  targetId: string,
  data: { role?: Role; supervisorId?: string | null },
) {
  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) throw new AppError(404, "User not found");

  if (data.supervisorId) {
    const supervisor = await prisma.user.findUnique({
      where: { id: data.supervisorId },
    });
    if (!supervisor) throw new AppError(404, "Supervisor not found");
    if (
      supervisor.role !== "SUPERVISOR" &&
      supervisor.role !== "FINANCIAL_ADMIN"
    ) {
      throw new AppError(
        400,
        "Assigned supervisor must have SUPERVISOR or FINANCIAL_ADMIN role",
      );
    }
  }

  return prisma.user.update({
    where: { id: targetId },
    data: {
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.supervisorId !== undefined
        ? { supervisorId: data.supervisorId }
        : {}),
    },
    select: USER_UPDATE_SELECT,
  });
}
