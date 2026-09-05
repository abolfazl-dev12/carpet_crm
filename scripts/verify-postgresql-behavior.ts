import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import prisma from "../src/lib/prisma";
import { AUTH_COOKIE_NAME, signSessionToken } from "../src/lib/auth";
import { POST as inventoryMovementRoute } from "../src/app/api/inventory/route";
import { testPostgresConcurrency } from "./test-postgresql-concurrency";
import { assertDisposableDatabase } from "./postgresql-test-safety.cjs";

function request(body: unknown, token: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/inventory", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${AUTH_COOKIE_NAME}=${token}`,
    },
    body: JSON.stringify(body),
  });
}

async function main(): Promise<void> {
  await assertDisposableDatabase(prisma);
  const admin = await prisma.user.create({
    data: {
      id: "pg-behavior-admin",
      name: "مدیر تست PostgreSQL",
      email: "pg-behavior-admin@example.invalid",
      phone: "09120000009",
      passwordHash: "not-used-by-this-test",
      role: "ADMIN",
      isActive: true,
    },
  });
  const token = await signSessionToken({
    userId: admin.id,
    sessionVersion: admin.sessionVersion,
  });

  const persianNames = ["دریا", "چکاوک", "جواد", "ترانه", "پریسا", "بهروز"];
  await prisma.customer.createMany({
    data: persianNames.map((firstName, index) => ({
      id: `pg-persian-customer-${index}`,
      code: `PG-FA-${index}`,
      firstName,
      lastName: "فرش‌دوست",
      phone: `091211111${index.toString().padStart(2, "0")}`,
      province: "اصفهان",
      city: index % 2 === 0 ? "کاشان" : "اصفهان",
      createdAt: new Date(Date.UTC(2025, 0, index + 1)),
      updatedAt: new Date(Date.UTC(2025, 0, index + 1)),
    })),
  });

  await prisma.product.create({
    data: {
      id: "pg-persian-product",
      code: "PG-PERSIAN-PRODUCT",
      name: "فرش شاه‌عباسی سرمه‌ای",
      pattern: "شاه‌عباسی",
      collection: "کاشان",
      shane: 1200,
      density: 3600,
      yarnMaterial: "اکریلیک هیت‌ست‌شده",
      weavingMachine: "وندویل",
      style: "کلاسیک",
      primaryColor: "سرمه‌ای",
      images: ["/images/persian.webp"],
      variants: {
        create: {
          id: "pg-concurrency-variant",
          sku: "PG-CONCURRENCY-SKU",
          size: "3x4",
          areaSquareMeters: 12,
          cashPrice: 300_000_000,
          installmentPrice: 360_000_000,
          stock: 1,
          reservedStock: 0,
          soldStock: 0,
        },
      },
    },
  });

  const customerMatches = await prisma.customer.findMany({
    where: { firstName: { contains: "ری" }, city: { contains: "ان" } },
    orderBy: { createdAt: "desc" },
  });
  assert.deepEqual(
    customerMatches.map((customer) => customer.firstName),
    ["پریسا", "دریا"],
  );

  const productMatches = await prisma.product.findMany({
    where: {
      name: { contains: "شاه‌عباسی" },
      primaryColor: { contains: "سرمه" },
    },
  });
  assert.deepEqual(productMatches.map((product) => product.id), ["pg-persian-product"]);

  const payload = {
    variantId: "pg-concurrency-variant",
    type: "SALE",
    quantity: 1,
    reason: "آزمون هم‌زمانی PostgreSQL",
  };
  const responses = await Promise.all([
    inventoryMovementRoute(request(payload, token)),
    inventoryMovementRoute(request(payload, token)),
  ]);
  const statuses = responses.map((response) => response.status).sort((a, b) => a - b);
  assert.equal(statuses.filter((status) => status === 200).length, 1);
  assert.equal(statuses.filter((status) => status === 400 || status === 409).length, 1);

  const variant = await prisma.productVariant.findUniqueOrThrow({
    where: { id: "pg-concurrency-variant" },
  });
  assert.equal(variant.stock, 0);
  assert.equal(variant.soldStock, 1);
  assert.equal(
    await prisma.inventoryMovement.count({
      where: { variantId: variant.id, type: "SALE" },
    }),
    1,
  );

  const databaseCollation = await prisma.$queryRawUnsafe<Array<{ collation: string }>>(
    "SELECT datcollate AS collation FROM pg_database WHERE datname = current_database()",
  );
  assert.ok(databaseCollation[0]?.collation);

  console.log("PostgreSQL Persian search/order: PASS");
  console.log("PostgreSQL concurrent inventory mutation: PASS (one sale, one rejection)");
  console.log(`PostgreSQL database collation detected: ${databaseCollation[0].collation}`);
  await testPostgresConcurrency(admin.id, token);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
