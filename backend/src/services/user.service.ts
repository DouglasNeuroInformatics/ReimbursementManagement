import { prisma } from "../lib/prisma.ts";
import { AppError } from "../middleware/error.ts";
import type { Role } from "../generated/prisma/client.ts";

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  preferredLocale: true,
  supervisorId: true,
  supervisor: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  employeeNumber: true,
  department: true,
  createdAt: true,
} as const;

const USER_UPDATE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  preferredLocale: true,
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
  data: { role?: Role; supervisorId?: string | null; employeeNumber?: string | null; department?: string | null },
  currentUserId?: string,
) {
  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) throw new AppError(404, "USER_NOT_FOUND");

  // Guard role changes that would corrupt access or orphan subordinates.
  if (data.role !== undefined && data.role !== user.role) {
    // #10: an admin must not demote themselves out of FINANCIAL_ADMIN and lose
    // access to the very screen they are using.
    if (targetId === currentUserId && data.role !== "FINANCIAL_ADMIN") {
      throw new AppError(400, "USER_CANNOT_DEMOTE_SELF");
    }
    // #9: demoting a supervisor to a plain USER would leave their subordinates
    // pointing at a non-supervisor. Block until those reports are reassigned.
    if (data.role === "USER") {
      const subordinateCount = await prisma.user.count({
        where: { supervisorId: targetId },
      });
      if (subordinateCount > 0) {
        throw new AppError(400, "USER_HAS_SUBORDINATES", {
          count: subordinateCount,
        });
      }
    }
  }

  if (data.supervisorId) {
    const supervisor = await prisma.user.findUnique({
      where: { id: data.supervisorId },
    });
    if (!supervisor) throw new AppError(404, "SUPERVISOR_NOT_FOUND");
    if (
      supervisor.role !== "SUPERVISOR" &&
      supervisor.role !== "FINANCIAL_ADMIN"
    ) {
      throw new AppError(400, "USER_SUPERVISOR_INVALID_ROLE");
    }
  }

  return prisma.user.update({
    where: { id: targetId },
    data: {
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.supervisorId !== undefined
        ? { supervisorId: data.supervisorId }
        : {}),
      ...(data.employeeNumber !== undefined
        ? { employeeNumber: data.employeeNumber }
        : {}),
      ...(data.department !== undefined
        ? { department: data.department }
        : {}),
    },
    select: USER_UPDATE_SELECT,
  });
}
