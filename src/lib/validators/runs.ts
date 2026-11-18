import { z } from "zod";

export const runRequestSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  inputs: z.record(z.string().max(40), z.string().max(5000)),
  consents: z.array(z.string().min(1).max(80)).max(12),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/),
});

export const approvalRequestSchema = z.object({
  stepId: z.string().min(1).max(80),
});
