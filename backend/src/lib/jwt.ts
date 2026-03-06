import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "./env.ts";

export interface AccessTokenPayload {
  sub: string;
  role: string;
  email: string;
}

export async function signAccessToken(
  payload: AccessTokenPayload,
): Promise<string> {
  const { JWT_SECRET } = getEnv();
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ role: payload.role, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload> {
  const { JWT_SECRET } = getEnv();
  const secret = new TextEncoder().encode(JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);
  if (
    typeof payload.sub !== "string" ||
    typeof payload.role !== "string" ||
    typeof payload.email !== "string"
  ) {
    throw new Error("Invalid token payload");
  }
  return { sub: payload.sub, role: payload.role, email: payload.email };
}
