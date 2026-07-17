import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const EXPIRES_IN = "30d";

export function signToken(payload: { userId: string; username: string }): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string; username: string } {
  return jwt.verify(token, SECRET) as { userId: string; username: string };
}
