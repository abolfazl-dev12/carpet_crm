import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import prisma from "../src/lib/prisma";
import { AUTH_COOKIE_NAME } from "../src/lib/auth";
import { DELETE as deleteOrder } from "../src/app/api/orders/route";
import { PUT as payInstallment } from "../src/app/api/installments/route";
import { assertDisposableDatabase } from "./postgresql-test-safety.cjs";

// The guarded PostgreSQL runner exclusively owns this disposable database.
// Force both handlers to wait on a real DB lock, rather than relying on timing
// or a Promise.all that might accidentally execute the requests serially.
async function contend(
  table: "Order" | "ProductVariant", id: string, calls: Array<() => Promise<Response>>,
): Promise<Response[]> {
  const controller = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  let responses: Promise<Response[]> | undefined;
  try {
    await controller.$transaction(async tx => {
      if (table === "Order") {
        await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${id} FOR NO KEY UPDATE`;
      } else {
        await tx.$queryRaw`SELECT "id" FROM "ProductVariant" WHERE "id" = ${id} FOR NO KEY UPDATE`;
      }
      responses = Promise.all(calls.map(call => call()));
      const deadline = Date.now() + 25_000;
      while (Date.now() < deadline) {
        // PostgreSQL caches statistics within a transaction; refresh so this
        // controller can observe handlers arriving after its first snapshot.
        await tx.$executeRaw`SELECT pg_stat_clear_snapshot()`;
        const waiting = await tx.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*) FROM pg_stat_activity
          WHERE datname = current_database() AND pid <> pg_backend_pid()
            AND wait_event_type = 'Lock' AND query LIKE ${`%UPDATE "${table}"%`}`;
        if (Number(waiting[0].count) >= calls.length) return;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw new Error("Both route transactions did not reach the PostgreSQL contention gate");
    }, { maxWait: 30_000, timeout: 40_000 });
    assert.ok(responses);
    return await responses;
  } finally {
    // The control transaction has released its gate before pending routes finish.
    if (responses) await responses;
    await controller.$disconnect();
  }
}

export async function testPostgresConcurrency(adminId: string, token: string): Promise<void> {
  await assertDisposableDatabase(prisma);
  const customer = await prisma.customer.create({ data: {
    code: "BLOCKER-CONCURRENCY", firstName: "تست", lastName: "همزمانی", phone: "09127779999", province: "اصفهان", city: "کاشان", assignedToId: adminId,
  } });
  const variantId = "pg-concurrency-variant";
  const request = (path: string, method: string, body?: unknown) => new NextRequest(`http://localhost:3000${path}`, {
    method, headers: { cookie: `${AUTH_COOKIE_NAME}=${token}`, "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const makeOrder = (orderNumber: string, items = false) => prisma.order.create({ data: {
    orderNumber, customerId: customer.id, sellerId: adminId, totalAmount: 1000, finalAmount: 1000, remainingAmount: 1000,
    ...(items ? { items: { create: { variantId, quantity: 1, unitPrice: 1000, totalPrice: 1000 } } } : {}),
  } });
  const remove = (id: string) => deleteOrder(request(`/api/orders?id=${id}`, "DELETE"));
  const pay = (id: string) => payInstallment(request("/api/installments", "PUT", { id, status: "PAID" }));

  await prisma.productVariant.update({ where: { id: variantId }, data: { stock: 5, soldStock: 2 } });
  const a = await makeOrder("BLOCKER-RETURN-A", true);
  const b = await makeOrder("BLOCKER-RETURN-B", true);
  const restored = await contend("ProductVariant", variantId, [() => remove(a.id), () => remove(b.id)]);
  assert.deepEqual(restored.map(r => r.status), [200, 200]);
  let variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
  assert.equal(variant.stock, 7); assert.equal(variant.soldStock, 0);
  const movements = await prisma.inventoryMovement.findMany({ where: { variantId, type: "RETURN" }, orderBy: { previousStock: "asc" } });
  assert.deepEqual(movements.map(m => [m.previousStock, m.newStock]), [[5, 6], [6, 7]]);
  assert.equal(await prisma.order.count({ where: { id: { in: [a.id, b.id] } } }), 0);
  console.log("PASS PG concurrency: different orders restore both units and consistent movements");

  const duplicate = await makeOrder("BLOCKER-DUPLICATE", true);
  const duplicateResults = await contend("Order", duplicate.id, [() => remove(duplicate.id), () => remove(duplicate.id)]);
  assert.deepEqual(duplicateResults.map(r => r.status).sort(), [200, 404]);
  variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
  assert.equal(variant.stock, 8);
  console.log("PASS PG concurrency: duplicate deletion restores only once");

  const failedReturn = await makeOrder("BLOCKER-FAIL-RETURN", true);
  await prisma.$executeRawUnsafe(`CREATE FUNCTION blocker_fail_return() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF NEW."reason" LIKE '%BLOCKER-FAIL-RETURN%' THEN RAISE EXCEPTION 'intentional return test failure'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe('CREATE TRIGGER blocker_fail_return BEFORE INSERT ON "InventoryMovement" FOR EACH ROW EXECUTE FUNCTION blocker_fail_return()');
  try {
    assert.equal((await remove(failedReturn.id)).status, 500);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock, 8);
    assert.ok(await prisma.order.findUnique({ where: { id: failedReturn.id } }));
    assert.equal(await prisma.inventoryMovement.count({ where: { reason: { contains: "BLOCKER-FAIL-RETURN" } } }), 0);
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER blocker_fail_return ON "InventoryMovement"');
    await prisma.$executeRawUnsafe('DROP FUNCTION blocker_fail_return()');
  }
  console.log("PASS PG concurrency: failed restoration rolls back stock, movement and order deletion");

  const paidOrder = await makeOrder("BLOCKER-PAYMENTS");
  const installments = await Promise.all([400, 600].map((amount, index) => prisma.installment.create({ data: {
    orderId: paidOrder.id, installmentNumber: index + 1, amount, dueDate: new Date(),
  } })));
  const paid = await contend("Order", paidOrder.id, installments.map(inst => () => pay(inst.id)));
  assert.deepEqual(paid.map(r => r.status), [200, 200]);
  const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: paidOrder.id }, include: { payments: true, installments: true } });
  assert.equal(finalOrder.payments.length, 2);
  assert.equal(finalOrder.payments.reduce((sum, p) => sum + p.amount, 0), 1000);
  assert.equal(finalOrder.paidAmount, 1000); assert.equal(finalOrder.remainingAmount, 0); assert.equal(finalOrder.status, "PAID");
  assert.ok(finalOrder.installments.every(i => i.status === "PAID"));
  console.log("PASS PG concurrency: two different installments settle the exact ledger balance");

  const failedPaymentOrder = await makeOrder("BLOCKER-FAIL-PAYMENT");
  const failedInst = await prisma.installment.create({ data: { orderId: failedPaymentOrder.id, installmentNumber: 1, amount: 400, dueDate: new Date() } });
  await prisma.$executeRawUnsafe(`CREATE FUNCTION blocker_fail_payment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF OLD."orderNumber" = 'BLOCKER-FAIL-PAYMENT' AND NEW."paidAmount" <> OLD."paidAmount" THEN RAISE EXCEPTION 'intentional payment test failure'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe('CREATE TRIGGER blocker_fail_payment BEFORE UPDATE ON "Order" FOR EACH ROW EXECUTE FUNCTION blocker_fail_payment()');
  try {
    assert.equal((await pay(failedInst.id)).status, 500);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: failedPaymentOrder.id }, include: { payments: true, installments: true } });
    assert.equal(order.payments.length, 0); assert.equal(order.paidAmount, 0); assert.equal(order.remainingAmount, 1000); assert.equal(order.status, "CONFIRMED");
    assert.equal(order.installments[0].status, "PENDING"); assert.equal(order.installments[0].paidDate, null);
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER blocker_fail_payment ON "Order"');
    await prisma.$executeRawUnsafe('DROP FUNCTION blocker_fail_payment()');
  }
  console.log("PASS PG concurrency: failed payment rolls back ledger, installment and aggregate (5/5)");
}
