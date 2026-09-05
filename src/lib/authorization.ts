import type { Prisma, Role } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface AssignedResourceScope {
  assignedToId?: string;
}

interface DealAuthorizationScope extends AssignedResourceScope {
  AND?: Prisma.DealWhereInput[];
}

interface FollowUpAuthorizationScope extends AssignedResourceScope {
  AND?: Prisma.FollowUpWhereInput[];
}

interface OrderAuthorizationScope {
  sellerId?: string;
  customer?: { assignedToId: string };
}

export const ALL_AUTHENTICATED_ROLES: readonly Role[] = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_REP",
  "VIEWER",
];

export const CRM_MUTATION_ROLES: readonly Role[] = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_REP",
];

export const MANAGEMENT_ROLES: readonly Role[] = ["ADMIN", "SALES_MANAGER"];
export const ADMIN_ROLES: readonly Role[] = ["ADMIN"];

export function hasAllowedRole(
  session: Pick<SessionPayload, "role">,
  allowedRoles: readonly Role[]
): boolean {
  return allowedRoles.includes(session.role);
}

export function canMutateCrm(session: Pick<SessionPayload, "role">): boolean {
  return hasAllowedRole(session, CRM_MUTATION_ROLES);
}

export function isEnumValue<T extends string>(
  values: readonly T[],
  value: string
): value is T {
  return values.some((candidate) => candidate === value);
}

export function canAccessOwners(
  session: Pick<SessionPayload, "role" | "userId">,
  ownerIds: readonly (string | null)[]
): boolean {
  return (
    session.role !== "SALES_REP" ||
    ownerIds.every((ownerId) => ownerId === session.userId)
  );
}

export function getCustomerScope(
  session: Pick<SessionPayload, "role" | "userId">
): AssignedResourceScope {
  return session.role === "SALES_REP" ? { assignedToId: session.userId } : {};
}

export function getLeadScope(
  session: Pick<SessionPayload, "role" | "userId">
): AssignedResourceScope {
  return session.role === "SALES_REP" ? { assignedToId: session.userId } : {};
}

export function getDealScope(
  session: Pick<SessionPayload, "role" | "userId">
): DealAuthorizationScope {
  if (session.role !== "SALES_REP") return {};

  const ownerId = session.userId;
  return {
    assignedToId: ownerId,
    AND: [
      { OR: [{ leadId: null }, { lead: { assignedToId: ownerId } }] },
      { OR: [{ customerId: null }, { customer: { assignedToId: ownerId } }] },
    ],
  };
}

export function getFollowUpScope(
  session: Pick<SessionPayload, "role" | "userId">
): FollowUpAuthorizationScope {
  if (session.role !== "SALES_REP") return {};

  const ownerId = session.userId;
  return {
    assignedToId: ownerId,
    AND: [
      { OR: [{ leadId: null }, { lead: { assignedToId: ownerId } }] },
      { OR: [{ customerId: null }, { customer: { assignedToId: ownerId } }] },
      { OR: [{ dealId: null }, { deal: getDealScope(session) }] },
    ],
  };
}

export function getOrderScope(
  session: Pick<SessionPayload, "role" | "userId">
): OrderAuthorizationScope {
  return session.role === "SALES_REP"
    ? {
        sellerId: session.userId,
        customer: { assignedToId: session.userId },
      }
    : {};
}

interface RelatedResourceIds {
  leadId?: string | null;
  customerId?: string | null;
  dealId?: string | null;
}

type AuthorizationDatabase = Pick<
  Prisma.TransactionClient,
  "lead" | "customer" | "deal"
>;

export type RelatedResourceAccess = "ALLOWED" | "NOT_FOUND" | "FORBIDDEN";

export async function checkRelatedResourceAccess(
  session: Pick<SessionPayload, "role" | "userId">,
  resourceIds: RelatedResourceIds,
  database: AuthorizationDatabase = prisma
): Promise<RelatedResourceAccess> {
  const [lead, customer, deal] = await Promise.all([
    resourceIds.leadId
      ? database.lead.findUnique({
          where: { id: resourceIds.leadId },
          select: { assignedToId: true },
        })
      : null,
    resourceIds.customerId
      ? database.customer.findUnique({
          where: { id: resourceIds.customerId },
          select: { assignedToId: true },
        })
      : null,
    resourceIds.dealId
      ? database.deal.findUnique({
          where: { id: resourceIds.dealId },
          select: {
            assignedToId: true,
            leadId: true,
            customerId: true,
            lead: { select: { assignedToId: true } },
            customer: { select: { assignedToId: true } },
          },
        })
      : null,
  ]);

  if (
    (resourceIds.leadId && !lead) ||
    (resourceIds.customerId && !customer) ||
    (resourceIds.dealId && !deal)
  ) {
    return "NOT_FOUND";
  }

  if (session.role !== "SALES_REP") return "ALLOWED";

  const ownerIds: (string | null)[] = [];
  if (lead) ownerIds.push(lead.assignedToId);
  if (customer) ownerIds.push(customer.assignedToId);
  if (deal) {
    ownerIds.push(deal.assignedToId);
    if (deal.leadId) ownerIds.push(deal.lead?.assignedToId ?? null);
    if (deal.customerId) ownerIds.push(deal.customer?.assignedToId ?? null);
  }

  return canAccessOwners(session, ownerIds) ? "ALLOWED" : "FORBIDDEN";
}
