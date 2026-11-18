import { z } from "zod";

export const exploreQuerySchema = z.object({
  q: z.string().trim().max(80, "Search must be 80 characters or fewer.").optional(),
  category: z.string().trim().max(40).optional(),
});

export function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}
