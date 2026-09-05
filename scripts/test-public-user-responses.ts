import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import prisma from "../src/lib/prisma";
import { AUTH_COOKIE_NAME, signSessionToken } from "../src/lib/auth";
import { POST as createCustomer } from "../src/app/api/customers/route";
import { PUT as updateCustomer } from "../src/app/api/customers/[id]/route";
import { POST as createLead } from "../src/app/api/leads/route";
import { PUT as updateLead } from "../src/app/api/leads/[id]/route";
import { POST as createFollowUp } from "../src/app/api/followups/route";
import { POST as createDeal, PUT as updateDeal } from "../src/app/api/pipeline/route";

function record(value: unknown): Record<string, unknown> {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}

function assertNoSecurityFields(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    // User currently has these two authentication-internal columns. Assert
    // recursively so future response nesting cannot hide either one.
    assert.ok(!["passwordHash", "sessionVersion", "password", "tokenVersion", "jwtSecret", "resetToken"].includes(key), `Sensitive response field: ${key}`);
    assertNoSecurityFields(child);
  }
}

export async function testPublicUserResponses(report: (condition: boolean, name: string) => void) {
  const tag = randomUUID();
  const manager = await prisma.user.create({ data: {
    name: "مدیر تست پاسخ", email: `projection-manager-${tag}@example.invalid`,
    phone: "09128880001", passwordHash: "synthetic-security-marker", role: "SALES_MANAGER", sessionVersion: 8,
  } });
  const assignee = await prisma.user.create({ data: {
    name: "مسئول تست پاسخ", email: `projection-admin-${tag}@example.invalid`,
    phone: "09128880002", passwordHash: "another-synthetic-security-marker", role: "ADMIN", sessionVersion: 9,
  } });
  const token = await signSessionToken({ userId: manager.id, sessionVersion: manager.sessionVersion });
  const req = (path: string, method: string, body: unknown) => new NextRequest(`http://localhost:3000${path}`, {
    method, headers: { "content-type": "application/json", cookie: `${AUTH_COOKIE_NAME}=${token}` }, body: JSON.stringify(body),
  });
  async function check(response: Response, key: string, label: string) {
    assert.equal(response.status, 200, label);
    const body: unknown = await response.json(); assertNoSecurityFields(body);
    const entity = record(record(body)[key]); const user = record(entity.assignedTo);
    assert.equal(user.id, assignee.id);
    assert.deepEqual(Object.keys(user).sort(), ["avatar", "id", "name"]);
    assert.equal(typeof entity.id, "string");
    report(true, `${label}: embedded User excludes passwordHash/sessionVersion and account internals`);
    return entity.id as string;
  }
  const contact = { firstName: "تست", lastName: "پاسخ امن", province: "اصفهان", city: "کاشان", assignedToId: assignee.id };
  const customerId = await check(await createCustomer(req("/api/customers", "POST", { ...contact, phone: "09127770001" })), "customer", "POST customers");
  await check(await updateCustomer(req(`/api/customers/${customerId}`, "PUT", { notes: "ویرایش تست" }), { params: Promise.resolve({ id: customerId }) }), "customer", "PUT customer");
  const leadId = await check(await createLead(req("/api/leads", "POST", { ...contact, phone: "09127770002" })), "lead", "POST leads");
  await check(await updateLead(req(`/api/leads/${leadId}`, "PUT", { notes: "ویرایش تست" }), { params: Promise.resolve({ id: leadId }) }), "lead", "PUT lead");
  await check(await createFollowUp(req("/api/followups", "POST", {
    title: "پیگیری تست", type: "CALL", scheduledAt: new Date().toISOString(), customerId, assignedToId: assignee.id,
  })), "followUp", "POST followups");
  const dealId = await check(await createDeal(req("/api/pipeline", "POST", {
    title: "معامله تست", customerId, leadId, assignedToId: assignee.id,
  })), "deal", "POST pipeline");
  await check(await updateDeal(req("/api/pipeline", "PUT", { id: dealId, title: "معامله تست ویرایش" })), "deal", "PUT pipeline");
}
