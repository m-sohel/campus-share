import { SEED_USERS } from "./seed-data";

export const DEMO_USERS = SEED_USERS;

export function getDemoUser(email: string) {
  return DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

