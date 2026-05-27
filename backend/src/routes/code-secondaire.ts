import { Hono } from "hono";
import { CODES_SECONDAIRES } from "../lib/code-secondaire.ts";
import type { HonoEnv } from "../types.ts";

const router = new Hono<HonoEnv>();

router.get("/", (c) => {
  return c.json({ codes: CODES_SECONDAIRES });
});

export default router;
