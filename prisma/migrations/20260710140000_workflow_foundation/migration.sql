-- Platform Release 1.3: Workflow foundation.
-- This migration adds reusable workflow definitions, stages, transitions,
-- instances, and history. Existing lead pipeline stages are projected into
-- workflow instances without fabricating historical workflow history.

CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowStage" (
    "id" TEXT NOT NULL,
    "workflowDefinitionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowTransition" (
    "id" TEXT NOT NULL,
    "workflowDefinitionId" TEXT NOT NULL,
    "fromStageId" TEXT NOT NULL,
    "toStageId" TEXT NOT NULL,
    "key" TEXT,
    "label" TEXT,
    "requiredPermission" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowTransition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowInstance" (
    "id" TEXT NOT NULL,
    "workflowDefinitionId" TEXT NOT NULL,
    "currentStageId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowHistory" (
    "id" TEXT NOT NULL,
    "workflowInstanceId" TEXT NOT NULL,
    "workflowDefinitionId" TEXT NOT NULL,
    "transitionId" TEXT,
    "previousStageId" TEXT,
    "nextStageId" TEXT,
    "previousStageKey" TEXT NOT NULL,
    "nextStageKey" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "actorType" "AuditActorType",
    "actorUserId" TEXT,
    "actorMembershipId" TEXT,
    "actorOrganisationId" TEXT,
    "outcome" "AuditOutcome" NOT NULL DEFAULT 'SUCCEEDED',
    "metadata" JSONB,
    "auditLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkflowDefinition_key_version_key" ON "WorkflowDefinition"("key", "version");
CREATE INDEX "WorkflowDefinition_key_isActive_idx" ON "WorkflowDefinition"("key", "isActive");

CREATE UNIQUE INDEX "WorkflowStage_workflowDefinitionId_key_key" ON "WorkflowStage"("workflowDefinitionId", "key");
CREATE UNIQUE INDEX "WorkflowStage_workflowDefinitionId_position_key" ON "WorkflowStage"("workflowDefinitionId", "position");
CREATE INDEX "WorkflowStage_workflowDefinitionId_isInitial_idx" ON "WorkflowStage"("workflowDefinitionId", "isInitial");
CREATE INDEX "WorkflowStage_workflowDefinitionId_isTerminal_idx" ON "WorkflowStage"("workflowDefinitionId", "isTerminal");

CREATE UNIQUE INDEX "WorkflowTransition_workflowDefinitionId_fromStageId_toStageId_key" ON "WorkflowTransition"("workflowDefinitionId", "fromStageId", "toStageId");
CREATE INDEX "WorkflowTransition_workflowDefinitionId_isActive_idx" ON "WorkflowTransition"("workflowDefinitionId", "isActive");
CREATE INDEX "WorkflowTransition_fromStageId_idx" ON "WorkflowTransition"("fromStageId");
CREATE INDEX "WorkflowTransition_toStageId_idx" ON "WorkflowTransition"("toStageId");

CREATE UNIQUE INDEX "WorkflowInstance_workflowDefinitionId_resourceType_resourceId_key" ON "WorkflowInstance"("workflowDefinitionId", "resourceType", "resourceId");
CREATE INDEX "WorkflowInstance_organisationId_currentStageId_idx" ON "WorkflowInstance"("organisationId", "currentStageId");
CREATE INDEX "WorkflowInstance_resourceType_resourceId_idx" ON "WorkflowInstance"("resourceType", "resourceId");
CREATE INDEX "WorkflowInstance_workflowDefinitionId_currentStageId_idx" ON "WorkflowInstance"("workflowDefinitionId", "currentStageId");

CREATE UNIQUE INDEX "WorkflowHistory_auditLogId_key" ON "WorkflowHistory"("auditLogId");
CREATE INDEX "WorkflowHistory_workflowInstanceId_createdAt_idx" ON "WorkflowHistory"("workflowInstanceId", "createdAt");
CREATE INDEX "WorkflowHistory_workflowDefinitionId_createdAt_idx" ON "WorkflowHistory"("workflowDefinitionId", "createdAt");
CREATE INDEX "WorkflowHistory_organisationId_createdAt_idx" ON "WorkflowHistory"("organisationId", "createdAt");
CREATE INDEX "WorkflowHistory_outcome_idx" ON "WorkflowHistory"("outcome");
CREATE INDEX "WorkflowHistory_actorUserId_idx" ON "WorkflowHistory"("actorUserId");
CREATE INDEX "WorkflowHistory_actorMembershipId_idx" ON "WorkflowHistory"("actorMembershipId");
CREATE INDEX "WorkflowHistory_transitionId_idx" ON "WorkflowHistory"("transitionId");

ALTER TABLE "WorkflowStage" ADD CONSTRAINT "WorkflowStage_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "WorkflowStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "WorkflowStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "WorkflowStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkflowHistory" ADD CONSTRAINT "WorkflowHistory_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowHistory" ADD CONSTRAINT "WorkflowHistory_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkflowHistory" ADD CONSTRAINT "WorkflowHistory_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "WorkflowTransition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkflowHistory" ADD CONSTRAINT "WorkflowHistory_previousStageId_fkey" FOREIGN KEY ("previousStageId") REFERENCES "WorkflowStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkflowHistory" ADD CONSTRAINT "WorkflowHistory_nextStageId_fkey" FOREIGN KEY ("nextStageId") REFERENCES "WorkflowStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkflowHistory" ADD CONSTRAINT "WorkflowHistory_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkflowHistory" ADD CONSTRAINT "WorkflowHistory_auditLogId_fkey" FOREIGN KEY ("auditLogId") REFERENCES "AuditLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "WorkflowDefinition" (
    "id",
    "key",
    "name",
    "description",
    "version",
    "isActive",
    "metadata",
    "createdAt",
    "updatedAt"
)
VALUES (
    'workflow_def_solargrant_lead_pipeline_v1',
    'solargrant.lead_pipeline',
    'SolarGRANT Pro Lead Pipeline',
    'Compatibility workflow definition for SolarGRANT Pro lead pipeline progression.',
    1,
    true,
    '{"release":"platform-release-1.3","resourceType":"lead","projectionField":"Lead.pipelineStage"}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

WITH stage_seed("id", "key", "label", "position", "isInitial", "isTerminal") AS (
    VALUES
        ('workflow_stage_solargrant_lead_pipeline_new_lead', 'NEW_LEAD', 'New Lead', 10, true, false),
        ('workflow_stage_solargrant_lead_pipeline_contacted', 'CONTACTED', 'Contacted', 20, false, false),
        ('workflow_stage_solargrant_lead_pipeline_qualified', 'QUALIFIED', 'Qualified', 30, false, false),
        ('workflow_stage_solargrant_lead_pipeline_survey_booked', 'SURVEY_BOOKED', 'Survey Booked', 40, false, false),
        ('workflow_stage_solargrant_lead_pipeline_survey_completed', 'SURVEY_COMPLETED', 'Survey Completed', 50, false, false),
        ('workflow_stage_solargrant_lead_pipeline_quote_sent', 'QUOTE_SENT', 'Quote Sent', 60, false, false),
        ('workflow_stage_solargrant_lead_pipeline_won', 'WON', 'Won', 70, false, true),
        ('workflow_stage_solargrant_lead_pipeline_lost', 'LOST', 'Lost', 80, false, true)
)
INSERT INTO "WorkflowStage" (
    "id",
    "workflowDefinitionId",
    "key",
    "label",
    "position",
    "isInitial",
    "isTerminal",
    "metadata",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    'workflow_def_solargrant_lead_pipeline_v1',
    "key",
    "label",
    "position",
    "isInitial",
    "isTerminal",
    jsonb_build_object('release', 'platform-release-1.3'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM stage_seed;

INSERT INTO "WorkflowTransition" (
    "id",
    "workflowDefinitionId",
    "fromStageId",
    "toStageId",
    "key",
    "label",
    "requiredPermission",
    "isActive",
    "metadata",
    "createdAt",
    "updatedAt"
)
SELECT
    'workflow_transition_solargrant_lead_pipeline_' || lower("fromStage"."key") || '_to_' || lower("toStage"."key"),
    'workflow_def_solargrant_lead_pipeline_v1',
    "fromStage"."id",
    "toStage"."id",
    lower("fromStage"."key") || '_to_' || lower("toStage"."key"),
    "fromStage"."label" || ' to ' || "toStage"."label",
    'lead.change_status',
    true,
    '{"release":"platform-release-1.3","compatibilityGraph":"permissive"}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "WorkflowStage" AS "fromStage"
CROSS JOIN "WorkflowStage" AS "toStage"
WHERE "fromStage"."workflowDefinitionId" = 'workflow_def_solargrant_lead_pipeline_v1'
  AND "toStage"."workflowDefinitionId" = 'workflow_def_solargrant_lead_pipeline_v1'
  AND "fromStage"."id" <> "toStage"."id";

INSERT INTO "WorkflowInstance" (
    "id",
    "workflowDefinitionId",
    "currentStageId",
    "organisationId",
    "resourceType",
    "resourceId",
    "startedAt",
    "completedAt",
    "metadata",
    "createdAt",
    "updatedAt"
)
SELECT
    'workflow_instance_lead_' || "Lead"."id",
    'workflow_def_solargrant_lead_pipeline_v1',
    "WorkflowStage"."id",
    "Lead"."organisationId",
    'lead',
    "Lead"."id",
    "Lead"."createdAt",
    CASE
        WHEN "Lead"."pipelineStage" IN ('WON'::"LeadPipelineStage", 'LOST'::"LeadPipelineStage") THEN "Lead"."updatedAt"
        ELSE NULL
    END,
    jsonb_build_object(
        'release', 'platform-release-1.3',
        'source', 'Lead.pipelineStage',
        'historyBackfilled', false
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Lead"
INNER JOIN "WorkflowStage"
    ON "WorkflowStage"."workflowDefinitionId" = 'workflow_def_solargrant_lead_pipeline_v1'
    AND "WorkflowStage"."key" = "Lead"."pipelineStage"::TEXT
ON CONFLICT ("workflowDefinitionId", "resourceType", "resourceId") DO NOTHING;
