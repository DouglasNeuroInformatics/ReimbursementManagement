import { prisma } from "../lib/prisma.ts";
import { flattenItems } from "./report.service.ts";

/** One billing account, pulled from the request's SUPERVISOR + APPROVE approval. */
type AccountContext = {
  accountNumber: string | null;
  accountLabel: string | null;
  fund: string | null;
  primaryCode: string | null;
};

/** Submission-level context shared by line-item and summary rows. */
type SubmissionContext = {
  requestId: string;
  title: string;
  type: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  requesterFirstName: string;
  requesterLastName: string;
  requesterEmail: string;
  employeeNumber: string | null;
  department: string | null;
  supervisorFirstName: string | null;
  supervisorLastName: string | null;
} & AccountContext;

export type FinanceHistoryLineItem = SubmissionContext & {
  itemId: string;
  itemType: "reimbursement" | "travel_advance" | "travel_expense";
  description: string;
  category: string | null;
  date: string | null;
  vendor: string | null;
  amount: number;
  notes: string | null;
  codeSecondaire: string | null;
  codeSecondaireLabel: string | null;
};

export type FinanceHistorySummary = SubmissionContext & {
  itemCount: number;
  total: number;
  destination: string | null;
  purpose: string | null;
  departureDate: string | null;
  returnDate: string | null;
};

export type FinanceHistory = {
  generatedAt: string;
  lineItems: FinanceHistoryLineItem[];
  summaries: FinanceHistorySummary[];
};

const itemOrder = [{ sortOrder: "asc" as const }, { id: "asc" as const }];

/**
 * Read-only export of every request in the system, in every state (including DRAFT).
 * FINANCIAL_ADMIN only — the route enforces the role gate.
 */
export async function getFinanceHistory(): Promise<FinanceHistory> {
  const requests = await prisma.request.findMany({
    orderBy: { createdAt: "desc" as const },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          employeeNumber: true,
          department: true,
          supervisor: { select: { firstName: true, lastName: true } },
        },
      },
      reimbursement: { include: { items: { orderBy: itemOrder } } },
      travelAdvance: { include: { items: { orderBy: itemOrder } } },
      travelReimbursement: { include: { items: { orderBy: itemOrder } } },
      approvals: {
        include: {
          account: { select: { accountNumber: true, label: true, fund: true, primaryCode: true } },
        },
      },
    },
  });

  const lineItems: FinanceHistoryLineItem[] = [];
  const summaries: FinanceHistorySummary[] = [];

  for (const request of requests) {
    const supervisorApproval = request.approvals.find(
      (a) => a.stage === "SUPERVISOR" && a.action === "APPROVE",
    );
    const account: AccountContext = supervisorApproval?.account
      ? {
          accountNumber: supervisorApproval.account.accountNumber,
          accountLabel: supervisorApproval.account.label,
          fund: supervisorApproval.account.fund,
          primaryCode: supervisorApproval.account.primaryCode,
        }
      : { accountNumber: null, accountLabel: null, fund: null, primaryCode: null };

    const context: SubmissionContext = {
      requestId: request.id,
      title: request.title,
      type: request.type,
      status: request.status,
      submittedAt: request.submittedAt?.toISOString() ?? null,
      createdAt: request.createdAt.toISOString(),
      requesterFirstName: request.user.firstName,
      requesterLastName: request.user.lastName,
      requesterEmail: request.user.email,
      employeeNumber: request.user.employeeNumber,
      department: request.user.department,
      supervisorFirstName: request.user.supervisor?.firstName ?? null,
      supervisorLastName: request.user.supervisor?.lastName ?? null,
      ...account,
    };

    const items = flattenItems(request);
    for (const it of items) {
      const { sortOrder: _sortOrder, ...flat } = it;
      lineItems.push({ ...context, ...flat });
    }

    const total = items.reduce((cents, it) => cents + Math.round(it.amount * 100), 0) / 100;

    const travel = request.travelAdvance ?? request.travelReimbursement ?? null;
    summaries.push({
      ...context,
      itemCount: items.length,
      total,
      destination: travel?.destination ?? null,
      purpose: travel?.purpose ?? null,
      departureDate: travel?.departureDate?.toISOString() ?? null,
      returnDate: travel?.returnDate?.toISOString() ?? null,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    lineItems,
    summaries,
  };
}
