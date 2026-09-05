-- RedefineTables
-- Abort before rebuilding any table when legacy JSON is malformed or has the
-- wrong top-level shape. The guard is temporary and leaves source data intact.
CREATE TEMP TABLE "_phase5_json_guard" (
    "valid" INTEGER NOT NULL CHECK ("valid" = 1)
);
INSERT INTO "_phase5_json_guard" ("valid")
SELECT CASE WHEN
    EXISTS (
        SELECT 1 FROM "CarpetNeedProfile"
        WHERE CASE
            WHEN json_valid("preferredSizes") = 1 THEN json_type("preferredSizes") <> 'array'
            ELSE true
        END
    )
    OR EXISTS (
        SELECT 1 FROM "CarpetNeedProfile"
        WHERE CASE
            WHEN json_valid("preferredColors") = 1 THEN json_type("preferredColors") <> 'array'
            ELSE true
        END
    )
    OR EXISTS (
        SELECT 1 FROM "Product"
        WHERE CASE
            WHEN json_valid("images") = 1 THEN json_type("images") <> 'array'
            ELSE true
        END
    )
    OR EXISTS (
        SELECT 1 FROM "AutomationRule"
        WHERE CASE
            WHEN json_valid("conditions") = 1 THEN json_type("conditions") <> 'object'
            ELSE true
        END
    )
    OR EXISTS (
        SELECT 1 FROM "AutomationRule"
        WHERE CASE
            WHEN json_valid("actions") = 1 THEN json_type("actions") <> 'object'
            ELSE true
        END
    )
    OR EXISTS (
        SELECT 1 FROM "AuditLog"
        WHERE "details" IS NOT NULL
          AND CASE
              WHEN json_valid("details") = 1 THEN json_type("details") <> 'object'
              ELSE true
          END
    )
THEN 0 ELSE 1 END;
DROP TABLE "_phase5_json_guard";

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "createdAt", "details", "entity", "entityId", "id", "ipAddress", "userAgent", "userId") SELECT "action", "createdAt", "details", "entity", "entityId", "id", "ipAddress", "userAgent", "userId" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE TABLE "new_AutomationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AutomationRule" ("actions", "conditions", "createdAt", "id", "isActive", "name", "triggerType", "updatedAt") SELECT "actions", "conditions", "createdAt", "id", "isActive", "name", "triggerType", "updatedAt" FROM "AutomationRule";
DROP TABLE "AutomationRule";
ALTER TABLE "new_AutomationRule" RENAME TO "AutomationRule";
CREATE TABLE "new_CarpetNeedProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preferredSizes" JSONB NOT NULL,
    "preferredShane" TEXT,
    "preferredDensity" TEXT,
    "preferredColors" JSONB NOT NULL,
    "preferredStyle" TEXT,
    "preferredCollection" TEXT,
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "paymentPreference" TEXT NOT NULL DEFAULT 'CASH',
    "spaceType" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT,
    "leadId" TEXT,
    CONSTRAINT "CarpetNeedProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CarpetNeedProfile_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CarpetNeedProfile" ("budgetMax", "budgetMin", "createdAt", "customerId", "id", "leadId", "notes", "paymentPreference", "preferredCollection", "preferredColors", "preferredDensity", "preferredShane", "preferredSizes", "preferredStyle", "quantity", "spaceType", "updatedAt") SELECT "budgetMax", "budgetMin", "createdAt", "customerId", "id", "leadId", "notes", "paymentPreference", "preferredCollection", "preferredColors", "preferredDensity", "preferredShane", "preferredSizes", "preferredStyle", "quantity", "spaceType", "updatedAt" FROM "CarpetNeedProfile";
DROP TABLE "CarpetNeedProfile";
ALTER TABLE "new_CarpetNeedProfile" RENAME TO "CarpetNeedProfile";
CREATE UNIQUE INDEX "CarpetNeedProfile_customerId_key" ON "CarpetNeedProfile"("customerId");
CREATE UNIQUE INDEX "CarpetNeedProfile_leadId_key" ON "CarpetNeedProfile"("leadId");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "shane" INTEGER NOT NULL,
    "density" INTEGER NOT NULL,
    "colorCount" INTEGER NOT NULL DEFAULT 8,
    "yarnMaterial" TEXT NOT NULL,
    "weavingMachine" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "images" JSONB NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("code", "collection", "colorCount", "createdAt", "density", "description", "id", "images", "isActive", "name", "pattern", "primaryColor", "shane", "style", "updatedAt", "weavingMachine", "yarnMaterial") SELECT "code", "collection", "colorCount", "createdAt", "density", "description", "id", "images", "isActive", "name", "pattern", "primaryColor", "shane", "style", "updatedAt", "weavingMachine", "yarnMaterial" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");
CREATE INDEX "Product_code_idx" ON "Product"("code");
CREATE INDEX "Product_pattern_idx" ON "Product"("pattern");
CREATE INDEX "Product_collection_idx" ON "Product"("collection");
CREATE INDEX "Product_shane_idx" ON "Product"("shane");
CREATE INDEX "Product_primaryColor_idx" ON "Product"("primaryColor");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
