import { describe, expect, it } from "vitest";
import { stepListSchema } from "./steps";

describe("step schema", () => {
  it("fails closed on an unknown block", () => {
    const parsed = stepListSchema.safeParse([
      { type: "browser", title: "Open a site", url: "https://example.com" },
    ]);
    expect(parsed.success).toBe(false);
  });
});
