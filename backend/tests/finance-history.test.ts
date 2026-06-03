import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import {
  cleanupDatabase,
  createTestRequest,
  createTestUsers,
  makeRequest,
  parseSetCookie,
} from "./test-utils.ts";

const API_BASE = "http://localhost:8000/api";

async function loginCookies(email: string, password: string): Promise<string> {
  const res = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email, password },
  });
  assertEquals(res.status, 200);
  return parseSetCookie(res.headers.get("set-cookie")).cookieHeader;
}

Deno.test({
  name: "Finance history: returns every request in every state with full context",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
  await cleanupDatabase();
  const { admin, user } = await createTestUsers();

  // DRAFT reimbursement (2 items) — must be included even though never submitted.
  await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT", "Draft reimbursement", {
    reimbursement: {
      items: [
        { description: "Taxi", amount: 25.5, date: new Date("2026-01-10"), vendor: "City Cabs", codeSecondaire: "65510" },
        { description: "Lunch", amount: 18, date: new Date("2026-01-11") },
      ],
    },
  });

  // SUBMITTED travel advance (1 item).
  await createTestRequest(user.id, "TRAVEL_ADVANCE", "SUBMITTED", "Advance for conf", {
    travelAdvance: {
      destination: "Montreal",
      purpose: "Conference",
      departureDate: new Date("2026-02-01"),
      returnDate: new Date("2026-02-03"),
      estimatedAmount: 500,
      items: [{ category: "accommodations", amount: 300 }],
    },
  });

  // PAID travel reimbursement (3 items).
  await createTestRequest(user.id, "TRAVEL_REIMBURSEMENT", "PAID", "Trip actuals", {
    travelReimbursement: {
      destination: "Ottawa",
      purpose: "Site visit",
      departureDate: new Date("2026-03-01"),
      returnDate: new Date("2026-03-02"),
      totalAmount: 420,
      items: [
        { date: new Date("2026-03-01"), category: "airfare", amount: 250 },
        { date: new Date("2026-03-01"), category: "taxi", amount: 40, vendor: "Capital Cabs" },
        { date: new Date("2026-03-02"), category: "meals", amount: 130 },
      ],
    },
  });

  const cookieHeader = await loginCookies(admin.email, admin.password);

  const res = await makeRequest(API_BASE, {
    method: "GET",
    path: "/finance/history",
    cookieHeader,
  });

  assertEquals(res.status, 200);
  assertExists(res.body.generatedAt);
  assert(Array.isArray(res.body.lineItems));
  assert(Array.isArray(res.body.summaries));

  // One summary per request, one line item per item across all requests.
  assertEquals(res.body.summaries.length, 3);
  assertEquals(res.body.lineItems.length, 2 + 1 + 3);

  // Every state present, including DRAFT.
  const statuses = res.body.summaries.map((s: { status: string }) => s.status).sort();
  assertEquals(statuses, ["DRAFT", "PAID", "SUBMITTED"]);

  // Spot-check submission context + classification label carried on a line item.
  const taxi = res.body.lineItems.find((li: { description: string }) => li.description === "Taxi");
  assertExists(taxi);
  assertEquals(taxi.status, "DRAFT");
  assertEquals(taxi.itemType, "reimbursement");
  assertEquals(taxi.codeSecondaire, "65510");
  assertExists(taxi.codeSecondaireLabel);
  assertEquals(taxi.requesterEmail, user.email);

  // Travel summary carries destination/purpose/dates and a correct total.
  const trip = res.body.summaries.find((s: { title: string }) => s.title === "Trip actuals");
  assertExists(trip);
  assertEquals(trip.itemCount, 3);
  assertEquals(trip.total, 420);
  assertEquals(trip.destination, "Ottawa");
  assertExists(trip.departureDate);
});

Deno.test({
  name: "Finance history: non-admin is forbidden",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();

  const cookieHeader = await loginCookies(user.email, user.password);

  const res = await makeRequest(API_BASE, {
    method: "GET",
    path: "/finance/history",
    cookieHeader,
  });

  assertEquals(res.status, 403);
});
