import type { User } from "@shared/schema";

/**
 * Strip sensitive fields from user before sending to client.
 * Replaces 13+ scattered `delete user.password` / destructuring patterns.
 */
export function toSafeUser<T extends User>(user: T): Omit<T, "password"> {
  const { password, ...safe } = user;
  return safe;
}

/**
 * Strip sensitive fields from array of users.
 */
export function toSafeUsers<T extends User>(users: T[]): Omit<T, "password">[] {
  return users.map(toSafeUser);
}

/**
 * Strip PII fields for limited-access views (e.g., student viewing teachers).
 */
export function toPublicUser<T extends User>(user: T): Pick<T, "id" | "name" | "username" | "role" | "avatar" | "level" | "mosqueId"> {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    avatar: user.avatar,
    level: user.level,
    mosqueId: user.mosqueId,
  } as Pick<T, "id" | "name" | "username" | "role" | "avatar" | "level" | "mosqueId">;
}
