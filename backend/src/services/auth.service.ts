import { hash, verify } from "@node-rs/argon2";
import { prisma } from "../lib/prisma.ts";
import { signAccessToken } from "../lib/jwt.ts";
import { AppError } from "../middleware/error.ts";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  if (existing) throw new AppError(409, "Email already in use");

  const passwordHash = await hash(data.password);
  return prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function login(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) throw new AppError(401, "Invalid credentials");

  const valid = await verify(user.passwordHash, password);
  if (!valid) throw new AppError(401, "Invalid credentials");

  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
  });
  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.session.create({
    data: { userId: user.id, token: refreshToken, expiresAt },
  });

  const fullUser = await getMe(user.id);

  return {
    accessToken,
    refreshToken,
    user: fullUser,
  };
}

export async function refresh(refreshToken: string) {
  const session = await prisma.session.findUnique({
    where: { token: refreshToken },
    include: {
      user: { select: { id: true, email: true, role: true } },
    },
  });
  if (!session) throw new AppError(401, "Invalid refresh token");
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    throw new AppError(401, "Refresh token expired");
  }
  const accessToken = await signAccessToken({
    sub: session.user.id,
    role: session.user.role,
    email: session.user.email,
  });
  return { accessToken };
}

export async function logout(refreshToken: string) {
  await prisma.session.deleteMany({ where: { token: refreshToken } });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
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
      address: true,
      phone: true,
      extension: true,
      jobPosition: true,
    },
  });
  if (!user) throw new AppError(404, "User not found");
  return user;
}

export async function updateMe(userId: string, data: {
  address?: string | null;
  phone?: string | null;
  extension?: string | null;
  jobPosition?: string | null;
}) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      supervisorId: true,
      supervisor: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      address: true,
      phone: true,
      extension: true,
      jobPosition: true,
      createdAt: true,
    },
  });
  if (!user) throw new AppError(404, "User not found");
  return user;
}
