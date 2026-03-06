import type { Role } from "./generated/prisma/client.ts";

export type AuthUser = {
  id: string;
  role: Role;
  email: string;
};

export type HonoEnv = {
  Variables: {
    user: AuthUser;
  };
};
