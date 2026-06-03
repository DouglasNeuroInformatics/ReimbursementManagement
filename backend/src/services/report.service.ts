import { prisma } from "../lib/prisma.ts";
import { AppError } from "../middleware/error.ts";
import { CODES_SECONDAIRES } from "../lib/code-secondaire.ts";
import type { Role } from "../generated/prisma/client.ts";

const codeDescriptionMap = new Map<string, string>(CODES_SECONDAIRES.map((c) => [c.code, c.description]));

type FlatItem = {
  itemId: string;
  itemType: "reimbursement" | "travel_advance" | "travel_expense";
  description: string;
  date: string | null;
  vendor: string | null;
  category: string | null;
  amount: number;
  notes: string | null;
  codeSecondaire: string | null;
  codeSecondaireLabel: string | null;
  sortOrder: number;
};

type ItemAmount = { toNumber: () => number } | string | number;

function toAmount(v: ItemAmount): number {
  if (typeof v === "object" && "toNumber" in v) return v.toNumber();
  return typeof v === "string" ? parseFloat(v) : v;
}

/** Source shape flattenItems reads from the report's Prisma payload. */
type FlattenSource = {
  reimbursement: {
    items: {
      id: string;
      description: string;
      date: Date;
      vendor: string | null;
      amount: ItemAmount;
      notes: string | null;
      codeSecondaire: string | null;
      sortOrder: number;
    }[];
  } | null;
  travelAdvance: {
    items: {
      id: string;
      category: string;
      amount: ItemAmount;
      notes: string | null;
      codeSecondaire: string | null;
      sortOrder: number;
    }[];
  } | null;
  travelReimbursement: {
    items: {
      id: string;
      date: Date;
      category: string;
      vendor: string | null;
      amount: ItemAmount;
      notes: string | null;
      codeSecondaire: string | null;
      sortOrder: number;
    }[];
  } | null;
};

function resolveLabel(code: string | null): string | null {
  if (!code) return null;
  return codeDescriptionMap.get(code as string) ?? null;
}

function flattenItems(request: FlattenSource): FlatItem[] {
  const items: FlatItem[] = [];

  if (request.reimbursement?.items) {
    for (const it of request.reimbursement.items) {
      items.push({
        itemId: it.id,
        itemType: "reimbursement",
        description: it.description,
        date: it.date.toISOString(),
        vendor: it.vendor ?? null,
        category: null,
        amount: toAmount(it.amount),
        notes: it.notes ?? null,
        codeSecondaire: it.codeSecondaire,
        codeSecondaireLabel: resolveLabel(it.codeSecondaire),
        sortOrder: it.sortOrder ?? 0,
      });
    }
  }

  if (request.travelAdvance?.items) {
    for (const it of request.travelAdvance.items) {
      items.push({
        itemId: it.id,
        itemType: "travel_advance",
        description: it.category,
        date: null,
        vendor: null,
        category: it.category,
        amount: toAmount(it.amount),
        notes: it.notes ?? null,
        codeSecondaire: it.codeSecondaire,
        codeSecondaireLabel: resolveLabel(it.codeSecondaire),
        sortOrder: it.sortOrder ?? 0,
      });
    }
  }

  if (request.travelReimbursement?.items) {
    for (const it of request.travelReimbursement.items) {
      items.push({
        itemId: it.id,
        itemType: "travel_expense",
        description: it.category,
        date: it.date.toISOString(),
        vendor: it.vendor ?? null,
        category: it.category,
        amount: toAmount(it.amount),
        notes: it.notes ?? null,
        codeSecondaire: it.codeSecondaire,
        codeSecondaireLabel: resolveLabel(it.codeSecondaire),
        sortOrder: it.sortOrder ?? 0,
      });
    }
  }

  items.sort((a, b) => a.sortOrder - b.sortOrder);
  return items;
}

// Accumulate money in integer cents to avoid IEEE-754 drift (see frontend sumAmounts).
function computeTotalsByCode(items: FlatItem[]) {
  const map = new Map<string, { code: string; description: string; cents: number }>();
  for (const it of items) {
    const code = it.codeSecondaire;
    if (!code) continue;
    const cents = Math.round(it.amount * 100);
    const existing = map.get(code);
    if (existing) {
      existing.cents += cents;
    } else {
      map.set(code, {
        code,
        description: it.codeSecondaireLabel ?? code,
        cents,
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(({ code, description, cents }) => ({ code, description, amount: cents / 100 }));
}

function canView(
  request: { userId: string; user: { supervisorId: string | null }; approvals: { actorId: string; stage: string; action: string }[] },
  userId: string,
  role: Role,
): boolean {
  if (role === "FINANCIAL_ADMIN") return true;
  if (request.userId === userId) return true;
  if (role === "SUPERVISOR") {
    if (request.user.supervisorId === userId) return true;
    if (request.approvals.some((a) => a.actorId === userId && a.stage === "SUPERVISOR" && a.action === "APPROVE")) return true;
  }
  return false;
}

export async function getReport(
  requestId: string,
  userId: string,
  role: Role,
) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          supervisorId: true,
          phone: true,
          extension: true,
          address: true,
          jobPosition: true,
          employeeNumber: true,
          department: true,
        },
      },
      reimbursement: {
        include: {
          items: {
            include: { documents: true },
            orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
          },
        },
      },
      travelAdvance: {
        include: {
          items: { orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }] },
        },
      },
      travelReimbursement: {
        include: {
          items: { orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }] },
        },
      },
      documents: true,
      approvals: {
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, role: true } },
          account: { select: { id: true, accountNumber: true, label: true, fund: true, primaryCode: true } },
        },
        orderBy: { createdAt: "asc" as const },
      },
    },
  });

  if (!request) throw new AppError(404, "REQUEST_NOT_FOUND");
  if (!canView(request, userId, role)) throw new AppError(403, "REQUEST_ACCESS_DENIED");

  if (request.status !== "FINANCE_APPROVED" && request.status !== "PAID") {
    throw new AppError(400, "REPORT_WRONG_STATUS");
  }

  const supervisor = request.user.supervisorId
    ? await prisma.user.findUnique({
        where: { id: request.user.supervisorId },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : null;

  const items = flattenItems(request);
  const totalsByCode = computeTotalsByCode(items);
  const grandTotal = items.reduce((cents, it) => cents + Math.round(it.amount * 100), 0) / 100;

  const supervisorApproval = request.approvals.find(
    (a) => a.stage === "SUPERVISOR" && a.action === "APPROVE",
  );
  const financeApprovals = request.approvals.filter(
    (a) => a.stage === "FINANCE" && a.action === "APPROVE",
  );
  const paidApproval = request.approvals.find(
    (a) => a.action === "PAID",
  );

  return {
    request: {
      id: request.id,
      title: request.title,
      type: request.type,
      status: request.status,
      description: request.description,
      submittedAt: request.submittedAt?.toISOString() ?? null,
      createdAt: request.createdAt.toISOString(),
    },
    requester: {
      firstName: request.user.firstName,
      lastName: request.user.lastName,
      email: request.user.email,
      employeeNumber: request.user.employeeNumber,
      department: request.user.department,
      phone: request.user.phone,
      extension: request.user.extension,
      address: request.user.address,
      jobPosition: request.user.jobPosition,
    },
    supervisor: supervisor
      ? { firstName: supervisor.firstName, lastName: supervisor.lastName, email: supervisor.email }
      : null,
    billingAccount: supervisorApproval?.account
      ? {
          accountNumber: supervisorApproval.account.accountNumber,
          label: supervisorApproval.account.label,
          fund: supervisorApproval.account.fund,
          primaryCode: supervisorApproval.account.primaryCode,
        }
      : null,
    lineItems: items,
    totals: {
      byCode: totalsByCode,
      grandTotal,
    },
    approvals: request.approvals.map((a) => ({
      actor: { firstName: a.actor.firstName, lastName: a.actor.lastName, role: a.actor.role },
      action: a.action,
      stage: a.stage,
      comment: a.comment,
      account: a.account
        ? {
            accountNumber: a.account.accountNumber,
            label: a.account.label,
            fund: a.account.fund,
            primaryCode: a.account.primaryCode,
          }
        : null,
      createdAt: a.createdAt.toISOString(),
    })),
    supervisorApproval: supervisorApproval
      ? {
          actor: { firstName: supervisorApproval.actor.firstName, lastName: supervisorApproval.actor.lastName },
          account: supervisorApproval.account
            ? {
                accountNumber: supervisorApproval.account.accountNumber,
                label: supervisorApproval.account.label,
                fund: supervisorApproval.account.fund,
                primaryCode: supervisorApproval.account.primaryCode,
              }
            : null,
          comment: supervisorApproval.comment,
          createdAt: supervisorApproval.createdAt.toISOString(),
        }
      : null,
    financeApprovals: financeApprovals.map((a) => ({
      actor: { firstName: a.actor.firstName, lastName: a.actor.lastName },
      comment: a.comment,
      createdAt: a.createdAt.toISOString(),
    })),
    paidApproval: paidApproval
      ? {
          actor: { firstName: paidApproval.actor.firstName, lastName: paidApproval.actor.lastName },
          comment: paidApproval.comment,
          createdAt: paidApproval.createdAt.toISOString(),
        }
      : null,
    travelDetails: request.travelAdvance
      ? {
          type: "TRAVEL_ADVANCE" as const,
          destination: request.travelAdvance.destination,
          purpose: request.travelAdvance.purpose,
          departureDate: request.travelAdvance.departureDate.toISOString(),
          returnDate: request.travelAdvance.returnDate.toISOString(),
          estimatedAmount: toAmount(request.travelAdvance.estimatedAmount),
        }
      : request.travelReimbursement
        ? {
            type: "TRAVEL_REIMBURSEMENT" as const,
            destination: request.travelReimbursement.destination,
            purpose: request.travelReimbursement.purpose,
            departureDate: request.travelReimbursement.departureDate.toISOString(),
            returnDate: request.travelReimbursement.returnDate.toISOString(),
            totalAmount: toAmount(request.travelReimbursement.totalAmount),
          }
        : null,
    documents: request.documents.map((d) => ({
      id: d.id,
      filename: d.filename,
      contentType: d.contentType,
      sizeBytes: d.sizeBytes,
      uploadedAt: d.uploadedAt.toISOString(),
      reimbursementItemId: d.reimbursementItemId,
    })),
    reportMeta: {
      generatedAt: new Date().toISOString(),
    },
  };
}
