import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  S3_ENDPOINT: z.string().url("S3_ENDPOINT must be a valid URL"),
  S3_ACCESS_KEY: z.string().min(1, "S3_ACCESS_KEY is required"),
  S3_SECRET_KEY: z.string().min(1, "S3_SECRET_KEY is required"),
  S3_BUCKET: z.string().min(1, "S3_BUCKET is required"),
  S3_PUBLIC_ENDPOINT: z.string().default(''),
  CURRENCY: z.string().default("CAD"),
  PORT: z.coerce.number().int().positive().default(8000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DEMO_MODE: z.enum(["true", "false"]).default("false"),
});

export type Env = z.infer<typeof schema>;

let _env: Env | undefined;

export function getEnv(): Env {
  if (_env) return _env;
  const raw: Record<string, string | undefined> = {};
  for (const key of Object.keys(schema.shape)) {
    raw[key] = Deno.env.get(key);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    throw new Error(`Environment configuration error — ${issues}`);
  }
  _env = result.data;
  return _env;
}
