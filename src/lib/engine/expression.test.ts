import { describe, expect, it } from "vitest";
import { EngineError, evaluateExpression } from "./expression";
import { applyTransform } from "./transform";

describe("evaluateExpression", () => {
  it("splits a bill without binary floating-point drift", () => {
    const tip = evaluateExpression("bill * tipPercent / 100", {
      bill: "80",
      tipPercent: "20",
    });
    const total = evaluateExpression("bill + tip", { bill: "80", tip });
    const each = evaluateExpression("total / people", { total, people: "4" });
    expect(each).toBe("24");
    expect(applyTransform("round", { each }, { sourceKey: "each", decimals: 2 })).toBe("24.00");
  });

  it("rounds a repeating split to cents", () => {
    const tip = evaluateExpression("bill * tipPercent / 100", { bill: "10", tipPercent: "15" });
    const total = evaluateExpression("bill + tip", { bill: "10", tip });
    const each = evaluateExpression("total / people", { total, people: "2" });
    expect(applyTransform("round", { each }, { sourceKey: "each", decimals: 2 })).toBe("5.75");
  });

  it("refuses division by zero, missing names, and extra syntax", () => {
    expect(() => evaluateExpression("1 / 0", {})).toThrow(EngineError);
    expect(() => evaluateExpression("bill + 1", {})).toThrow(/bill/);
    expect(() => evaluateExpression("1 + alert(1)", {})).toThrow(EngineError);
    expect(() => evaluateExpression("process.exit", {})).toThrow(EngineError);
  });
});

describe("applyTransform", () => {
  it("numbers a messy list and fills a template", () => {
    const checklist = applyTransform("number_list", { items: "passport, charger\ntoothbrush" }, { sourceKey: "items" });
    expect(checklist).toBe("1. passport\n2. charger\n3. toothbrush");
    expect(
      applyTransform("template", { celsius: "100", fahrenheitRounded: "212.0" }, {
        template: "{{celsius}}°C is {{fahrenheitRounded}}°F.",
      }),
    ).toBe("100°C is 212.0°F.");
  });
});
