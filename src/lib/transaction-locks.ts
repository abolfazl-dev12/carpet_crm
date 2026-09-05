import type { Prisma } from "@prisma/client";

// A no-op UPDATE acquires a database write lock until transaction completion.
// Unlike SELECT FOR UPDATE, this also works on the SQLite compatibility path.
// Run before reading state; do not change timestamps or business fields.
export async function lockOrderForMutation(tx: Prisma.TransactionClient, id: string) {
  return (await tx.$executeRaw`UPDATE "Order" SET "id" = "id" WHERE "id" = ${id}`) === 1;
}

export async function lockVariantForMutation(tx: Prisma.TransactionClient, id: string) {
  return (await tx.$executeRaw`UPDATE "ProductVariant" SET "id" = "id" WHERE "id" = ${id}`) === 1;
}
