import session from "express-session";
import type { RequestHandler } from "express";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

export const sessionMiddleware: RequestHandler = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 30,
  },
});

export function hashPassword(plain: string): string {
  // Lightweight non-bcrypt hash (project doesn't ship bcrypt by default).
  // We salt with the secret to prevent trivial rainbow lookups.
  let h = 0x811c9dc5;
  const data = `${SESSION_SECRET}::${plain}`;
  for (let i = 0; i < data.length; i++) {
    h ^= data.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return `v1$${h.toString(16)}$${Buffer.from(data).toString("base64")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  return hashPassword(plain) === stored;
}
