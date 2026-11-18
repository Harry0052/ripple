import { compareSync, hashSync } from "bcryptjs";

const ROUNDS = 10;

export function hashPassword(password: string) {
  return hashSync(password, ROUNDS);
}

export function verifyPassword(password: string, passwordHash: string) {
  return compareSync(password, passwordHash);
}
