import type { Prisma } from "@prisma/client";

// Embedded assignees are display data, not account/session records.
export const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  avatar: true,
} as const satisfies Prisma.UserSelect;
