import { eq } from "drizzle-orm";
import type { RippleDb } from "./client";
import { users, workflowSteps, workflowVersions, workflows } from "./schema";
import { DEMO_PUBLISHED_AT, DEMO_USER, DEMO_WORKFLOWS } from "@/lib/workflows/demos";
import { stepListSchema } from "@/lib/workflows/steps";

export function seedDemoWorkflows(db: RippleDb) {
  for (const demo of DEMO_WORKFLOWS) {
    const parsed = stepListSchema.safeParse(demo.steps);
    if (!parsed.success) {
      throw new Error(`Demo recipe ${demo.slug} failed validation.`);
    }
  }

  db.transaction((tx) => {
    tx.insert(users)
      .values({
        id: DEMO_USER.id,
        handle: DEMO_USER.handle,
        displayName: DEMO_USER.displayName,
        kind: DEMO_USER.kind,
        createdAt: DEMO_PUBLISHED_AT,
      })
      .onConflictDoNothing()
      .run();

    for (const demo of DEMO_WORKFLOWS) {
      const existing = tx.select({ id: workflows.id }).from(workflows).where(eq(workflows.id, demo.id)).get();
      if (existing) continue;

      tx.insert(workflows)
        .values({
          id: demo.id,
          ownerId: DEMO_USER.id,
          slug: demo.slug,
          title: demo.title,
          summary: demo.summary,
          category: demo.category,
          visibility: "public",
          estimatedMinutes: demo.estimatedMinutes,
          origin: "demo_seed",
          publishedVersionId: null,
          createdAt: DEMO_PUBLISHED_AT,
          updatedAt: DEMO_PUBLISHED_AT,
        })
        .run();

      tx.insert(workflowVersions)
        .values({
          id: demo.versionId,
          workflowId: demo.id,
          version: 1,
          status: "published",
          permissionsJson: JSON.stringify({ items: demo.permissions }),
          prerequisites: demo.prerequisites,
          successCriteria: demo.successCriteria,
          risks: demo.risks,
          testStatus: "untested",
          publishedAt: DEMO_PUBLISHED_AT,
          lastVerifiedAt: null,
          createdAt: DEMO_PUBLISHED_AT,
        })
        .run();

      demo.steps.forEach((step, index) => {
        tx.insert(workflowSteps)
          .values({
            id: `${demo.versionId}_s${index + 1}`,
            versionId: demo.versionId,
            ordinal: index + 1,
            stepType: step.type,
            title: step.title,
            configJson: JSON.stringify(step),
          })
          .run();
      });

      tx.update(workflows)
        .set({ publishedVersionId: demo.versionId, updatedAt: DEMO_PUBLISHED_AT })
        .where(eq(workflows.id, demo.id))
        .run();
    }
  });
}
