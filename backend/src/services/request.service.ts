import { prisma } from "../lib/prisma.ts";
import { AppError } from "../middleware/error.ts";
import type { RequestStatus, RequestType, Role } from "../generated/prisma/client.ts";

const EDITABLE_STATUSES: RequestStatus[] = [
  "DRAFT",
  "SUPERVISOR_REJECTED",
  "FINANCE_REJECTED",
];

type RequestFilters = {
  status?: string;
  type?: string;
  scope?: 'own';
  limit?: number;
  cursor?: string;
};

type CreateRequestData = {
  type: RequestType;
  title: string;
  description?: string;
};

type ReimbursementInput = {
  items?: Array<{
    description: string;
    amount: number;
    date: string;
    vendor?: string | null;
    notes?: string | null;
  }>;
};

type TravelAdvanceInput = {
  destination?: string;
  purpose?: string;
  departureDate?: string;
  returnDate?: string;
  estimatedAmount?: number;
  items?: Array<{ category: string; amount: number; notes?: string | null }>;
};

type TravelReimbursementInput = {
  destination?: string;
  purpose?: string;
  departureDate?: string;
  returnDate?: string;
  totalAmount?: number;
  advanceRequestId?: string | null;
  items?: Array<{
    date: string;
    category: string;
    amount: number;
    vendor?: string | null;
    notes?: string | null;
  }>;
};

type UpdateRequestData = {
  title?: string;
  description?: string | null;
  reimbursement?: ReimbursementInput;
  travelAdvance?: TravelAdvanceInput;
  travelReimbursement?: TravelReimbursementInput;
};

const requestInclude = {
  user: { select: { id: true, firstName: true, lastName: true, email: true, supervisorId: true } },
  reimbursement: { include: { items: { include: { documents: true }, orderBy: { date: 'asc' as const } } } },
  travelAdvance: { include: { items: true } },
  travelReimbursement: { include: { items: true } },
  documents: true,
  approvals: {
    include: {
      actor: { select: { id: true, firstName: true, lastName: true } },
      account: { select: { id: true, accountNumber: true, label: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

function canView(
  request: { userId: string; user: { supervisorId: string | null } },
  userId: string,
  role: Role,
): boolean {
  if (role === "FINANCIAL_ADMIN") return true;
  if (request.userId === userId) return true;
  if (role === "SUPERVISOR" && request.user.supervisorId === userId) return true;
  if (role === "SUPERVISOR" && !request.user.supervisorId) return true;
  return false;
}

export async function getRequests(
  userId: string,
  role: Role,
  filters: RequestFilters = {},
) {
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;

  if (filters.scope === 'own' || role === 'USER') {
    where.userId = userId;
  } else if (role === 'SUPERVISOR') {
    const subs = await prisma.user.findMany({
      where: { supervisorId: userId },
      select: { id: true },
    });
    where.userId = { in: [userId, ...subs.map((u) => u.id)] };
  }

  const take = Math.min(filters.limit ?? 50, 100);
  const cursor = filters.cursor;

  const requests = await prisma.request.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, supervisorId: true } },
      reimbursement: { include: { items: { select: { amount: true } } } },
      travelAdvance: { select: { estimatedAmount: true } },
      travelReimbursement: { select: { totalAmount: true } },
      approvals: {
        include: {
          actor: { select: { id: true, firstName: true, lastName: true } },
          account: { select: { id: true, accountNumber: true, label: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { documents: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = requests.length > take;
  const items = hasMore ? requests.slice(0, take) : requests;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return { requests: items, nextCursor, hasMore };
}

export async function getRequest(
  requestId: string,
  userId: string,
  role: Role,
) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: requestInclude,
  });
  if (!request) throw new AppError(404, "Request not found");
  if (!canView(request, userId, role)) throw new AppError(403, "Access denied");
  return request;
}

export async function createRequest(userId: string, data: CreateRequestData) {
  return prisma.request.create({
    data: {
      userId,
      type: data.type,
      title: data.title,
      description: data.description ?? null,
      status: "DRAFT",
    },
  });
}

export async function updateRequest(
  requestId: string,
  userId: string,
  role: Role,
  data: UpdateRequestData,
) {
  const request = await getRequest(requestId, userId, role);
  if (!EDITABLE_STATUSES.includes(request.status)) {
    throw new AppError(400, `Cannot edit request with status: ${request.status}`);
  }
  if (request.userId !== userId) {
    throw new AppError(403, "Only the request owner can edit it");
  }

  await prisma.$transaction(async (tx) => {
    await tx.request.update({
      where: { id: requestId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    });

    if (data.reimbursement && request.type === "REIMBURSEMENT") {
      const detail = await tx.reimbursementDetail.upsert({
        where: { requestId },
        create: { requestId },
        update: {},
      });
      if (data.reimbursement.items !== undefined) {
        // Capture old item → document mapping before deleting items
        const oldItems = await tx.reimbursementItem.findMany({
          where: { detailId: detail.id },
          orderBy: { date: "asc" },
          select: { id: true, documents: { select: { id: true } } },
        });
        const oldDocsByIndex: string[][] = oldItems.map((it: { id: string; documents: { id: string }[] }) => it.documents.map((d: { id: string }) => d.id));

        await tx.reimbursementItem.deleteMany({ where: { detailId: detail.id } });
        if (data.reimbursement.items.length > 0) {
          await tx.reimbursementItem.createMany({
            data: data.reimbursement.items.map((item) => ({
              detailId: detail.id,
              description: item.description,
              amount: item.amount,
              date: new Date(item.date),
              vendor: item.vendor ?? null,
              notes: item.notes ?? null,
            })),
          });

          // Re-associate documents with new items by index
          const newItems = await tx.reimbursementItem.findMany({
            where: { detailId: detail.id },
            orderBy: { date: "asc" },
            select: { id: true },
          });
          for (let i = 0; i < Math.min(oldDocsByIndex.length, newItems.length); i++) {
            if (oldDocsByIndex[i].length > 0) {
              await tx.document.updateMany({
                where: { id: { in: oldDocsByIndex[i] } },
                data: { reimbursementItemId: newItems[i].id },
              });
            }
          }
        }
      }
    }

    if (data.travelAdvance && request.type === "TRAVEL_ADVANCE") {
      const ta = data.travelAdvance;
      const detail = await tx.travelAdvanceDetail.upsert({
        where: { requestId },
        create: {
          requestId,
          destination: ta.destination ?? "",
          purpose: ta.purpose ?? "",
          departureDate: ta.departureDate ? new Date(ta.departureDate) : new Date(),
          returnDate: ta.returnDate ? new Date(ta.returnDate) : new Date(),
          estimatedAmount: ta.estimatedAmount ?? 0,
        },
        update: {
          ...(ta.destination ? { destination: ta.destination } : {}),
          ...(ta.purpose ? { purpose: ta.purpose } : {}),
          ...(ta.departureDate ? { departureDate: new Date(ta.departureDate) } : {}),
          ...(ta.returnDate ? { returnDate: new Date(ta.returnDate) } : {}),
          ...(ta.estimatedAmount !== undefined ? { estimatedAmount: ta.estimatedAmount } : {}),
        },
      });
      if (ta.items !== undefined) {
        await tx.travelAdvanceItem.deleteMany({ where: { detailId: detail.id } });
        if (ta.items.length > 0) {
          await tx.travelAdvanceItem.createMany({
            data: ta.items.map((item) => ({
              detailId: detail.id,
              category: item.category,
              amount: item.amount,
              notes: item.notes ?? null,
            })),
          });
        }
      }
    }

    if (data.travelReimbursement && request.type === "TRAVEL_REIMBURSEMENT") {
      const tr = data.travelReimbursement;
      const detail = await tx.travelReimbursementDetail.upsert({
        where: { requestId },
        create: {
          requestId,
          destination: tr.destination ?? "",
          purpose: tr.purpose ?? "",
          departureDate: tr.departureDate ? new Date(tr.departureDate) : new Date(),
          returnDate: tr.returnDate ? new Date(tr.returnDate) : new Date(),
          totalAmount: tr.totalAmount ?? 0,
          advanceRequestId: tr.advanceRequestId ?? null,
        },
        update: {
          ...(tr.destination ? { destination: tr.destination } : {}),
          ...(tr.purpose ? { purpose: tr.purpose } : {}),
          ...(tr.departureDate ? { departureDate: new Date(tr.departureDate) } : {}),
          ...(tr.returnDate ? { returnDate: new Date(tr.returnDate) } : {}),
          ...(tr.totalAmount !== undefined ? { totalAmount: tr.totalAmount } : {}),
          ...(tr.advanceRequestId !== undefined ? { advanceRequestId: tr.advanceRequestId } : {}),
        },
      });
      if (tr.items !== undefined) {
        await tx.travelExpenseItem.deleteMany({ where: { detailId: detail.id } });
        if (tr.items.length > 0) {
          await tx.travelExpenseItem.createMany({
            data: tr.items.map((item) => ({
              detailId: detail.id,
              date: new Date(item.date),
              category: item.category,
              amount: item.amount,
              vendor: item.vendor ?? null,
              notes: item.notes ?? null,
            })),
          });
        }
      }
    }
  });

  return getRequest(requestId, userId, role);
}

export async function deleteRequest(requestId: string, userId: string) {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError(404, "Request not found");
  if (request.userId !== userId) throw new AppError(403, "Access denied");
  if (request.status !== "DRAFT") {
    throw new AppError(400, `Cannot delete request with status: ${request.status}`);
  }
  // Clean up S3 objects before deleting the request (cascade deletes DB docs)
  const { deleteRequestDocuments } = await import("./storage.service.ts");
  await deleteRequestDocuments(requestId);
  await prisma.request.delete({ where: { id: requestId } });
}

export async function submitRequest(requestId: string, userId: string) {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError(404, "Request not found");
  if (request.userId !== userId) throw new AppError(403, "Access denied");
  if (request.status !== "DRAFT") {
    throw new AppError(400, `Cannot submit request with status: ${request.status}`);
  }
  return prisma.request.update({
    where: { id: requestId },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });
}

export async function reviseRequest(requestId: string, userId: string) {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError(404, "Request not found");
  if (request.userId !== userId) throw new AppError(403, "Access denied");
  if (
    request.status !== "SUPERVISOR_REJECTED" &&
    request.status !== "FINANCE_REJECTED"
  ) {
    throw new AppError(400, `Cannot revise request with status: ${request.status}`);
  }
  return prisma.request.update({
    where: { id: requestId },
    data: { status: "DRAFT" },
  });
}
