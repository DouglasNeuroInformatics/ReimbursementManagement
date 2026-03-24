import { assertEquals } from "jsr:@std/assert";
import app from "../main.ts";

Deno.test({ name: "Health: GET /healthz - returns ok", sanitizeResources: false, sanitizeOps: false }, async () => {
  const response = await app.request("http://localhost/healthz");
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.status, "ok");
});
