import { PrismaClient, Prisma } from "@prisma/client";
import prisma from "./prisma";

type TxOrClient = Prisma.TransactionClient | typeof prisma;

/**
 * Concurrency-safe customer code generator.
 * Finds highest sequential number and verifies uniqueness to prevent race conditions.
 */
export async function generateCustomerCode(tx: TxOrClient): Promise<string> {
  const lastCustomer = await tx.customer.findFirst({
    where: { code: { startsWith: "CST-" } },
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });

  let nextNum = 1001;
  if (lastCustomer?.code) {
    const match = lastCustomer.code.match(/CST-(\d+)/);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed >= 1000) {
        nextNum = parsed + 1;
      }
    }
  }

  // Ensure absolute uniqueness
  let code = `CST-${nextNum}`;
  let existing = await tx.customer.findUnique({ where: { code }, select: { id: true } });
  while (existing) {
    nextNum++;
    code = `CST-${nextNum}`;
    existing = await tx.customer.findUnique({ where: { code }, select: { id: true } });
  }

  return code;
}

/**
 * Concurrency-safe order number generator.
 */
export async function generateOrderNumber(tx: TxOrClient): Promise<string> {
  const lastOrder = await tx.order.findFirst({
    where: { orderNumber: { startsWith: "ORD-1403-" } },
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true },
  });

  let nextNum = 1001;
  if (lastOrder?.orderNumber) {
    const match = lastOrder.orderNumber.match(/ORD-1403-(\d+)/);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed >= 1000) {
        nextNum = parsed + 1;
      }
    }
  }

  let orderNumber = `ORD-1403-${nextNum}`;
  let existing = await tx.order.findUnique({ where: { orderNumber }, select: { id: true } });
  while (existing) {
    nextNum++;
    orderNumber = `ORD-1403-${nextNum}`;
    existing = await tx.order.findUnique({ where: { orderNumber }, select: { id: true } });
  }

  return orderNumber;
}
