import { createHmac, timingSafeEqual } from "node:crypto";
import type { CookieOptions, Request } from "express";

// 공용 관리자 비밀번호 하나로 로그인하는 간단한 인증.
// 세션 토큰 = "만료시각.서명" 형태이고, 서명은 JWT_SECRET으로 HMAC.

export const SESSION_COOKIE = "church_session";
const SESSION_MS = 1000 * 60 * 60 * 24 * 30; // 30일

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET 환경변수가 설정되지 않았습니다.");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function passwordMatches(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(input, expected);
}

export function createSessionToken() {
  const expiresAt = String(Date.now() + SESSION_MS);
  return { token: `${expiresAt}.${sign(expiresAt)}`, maxAge: SESSION_MS };
}

function readCookie(req: Request, name: string) {
  const header = req.headers?.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function isAuthenticated(req: Request) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return false;
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) return false;
  if (Number(expiresAt) < Date.now()) return false;
  try {
    return safeEqual(signature, sign(expiresAt));
  } catch {
    return false;
  }
}

export function sessionCookieOptions(req: Request): CookieOptions {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: req.secure,
  };
}
