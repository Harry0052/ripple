import { z } from "zod";
import { stepListSchema, type WorkflowStep } from "./steps";

export const CATEGORY_IDS = ["everyday-math", "text-tools", "demo-forms"] as const;

export const draftSchema = z.object({
  title: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(1).max(280),
  category: z.enum(CATEGORY_IDS),
  estimatedMinutes: z.number().int().min(1).max(60),
  visibility: z.enum(["public", "private"]),
  sampleInputs: z.record(z.string().max(40), z.string().max(5000)),
  steps: stepListSchema,
});

export type DraftInput = z.infer<typeof draftSchema>;

export const DEFAULT_DRAFT: DraftInput = {
  title: "Double a number",
  summary: "Multiply a number by two and write a sentence.",
  category: "everyday-math",
  estimatedMinutes: 1,
  visibility: "private",
  sampleInputs: { value: "4" },
  steps: [
    {
      type: "input",
      title: "Collect a number",
      fields: [{ key: "value", label: "Value", type: "number", required: true, min: -1000000, max: 1000000 }],
    },
    {
      type: "calculate",
      title: "Double it",
      label: "Double",
      expression: "value * 2",
      outputKey: "doubled",
    },
    {
      type: "transform",
      title: "Write it",
      label: "Message",
      operation: "template",
      outputKey: "message",
      template: "Double is {{doubled}}.",
    },
  ],
};

export function blankStep(type: WorkflowStep["type"]): WorkflowStep {
  if (type === "input") {
    return {
      type,
      title: "Collect a value",
      fields: [{ key: "value", label: "Value", type: "text", required: true, maxLength: 200 }],
    };
  }
  if (type === "calculate") {
    return { type, title: "Calculate", label: "Result", expression: "value", outputKey: "result" };
  }
  if (type === "transform") {
    return {
      type,
      title: "Rewrite",
      label: "Text",
      operation: "template",
      outputKey: "text",
      template: "{{value}}",
    };
  }
  return {
    type,
    title: "Save on Ripple",
    label: "Saved note",
    formTitle: "Save on Ripple",
    includeKeys: ["text"],
    requiresApproval: true,
  };
}
