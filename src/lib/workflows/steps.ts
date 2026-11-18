import { z } from "zod";

const keySchema = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]{0,40}$/, "Use a short name that starts with a letter.");

export const inputFieldSchema = z.object({
  key: keySchema,
  label: z.string().trim().min(1).max(80),
  type: z.enum(["text", "number"]),
  required: z.boolean(),
  sensitive: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  maxLength: z.number().int().positive().max(5000).optional(),
  placeholder: z.string().max(120).optional(),
  help: z.string().max(200).optional(),
});

export const stepSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("input"),
    title: z.string().trim().min(1).max(80),
    fields: z.array(inputFieldSchema).min(1).max(8),
  }),
  z.object({
    type: z.literal("calculate"),
    title: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(80),
    expression: z.string().trim().min(1).max(200),
    outputKey: keySchema,
  }),
  z.object({
    type: z.literal("transform"),
    title: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(80),
    operation: z.enum([
      "template",
      "uppercase",
      "lowercase",
      "trim",
      "title_case",
      "number_list",
      "round",
    ]),
    sourceKey: keySchema.optional(),
    outputKey: keySchema,
    template: z.string().max(500).optional(),
    decimals: z.number().int().min(0).max(8).optional(),
  }),
  z.object({
    type: z.literal("demo_form"),
    title: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(80),
    formTitle: z.string().trim().min(1).max(120),
    includeKeys: z.array(keySchema).min(1).max(8),
    requiresApproval: z.literal(true),
  }),
]);

export const stepListSchema = z.array(stepSchema).min(1).max(12);
export const permissionsSchema = z.object({
  items: z.array(z.string().trim().min(1).max(200)).min(1).max(8),
});

export type WorkflowStep = z.infer<typeof stepSchema>;
export type InputField = z.infer<typeof inputFieldSchema>;

export function parseSteps(json: string) {
  return stepListSchema.safeParse(JSON.parse(json));
}

export function parsePermissions(json: string) {
  return permissionsSchema.safeParse(JSON.parse(json));
}
