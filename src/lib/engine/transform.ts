import Decimal from "decimal.js";
import { EngineError } from "./expression";

export type TransformOperation =
  | "template"
  | "uppercase"
  | "lowercase"
  | "trim"
  | "title_case"
  | "number_list"
  | "round";

function need(scope: Record<string, string>, key: string | undefined) {
  if (!key || scope[key] === undefined) {
    throw new EngineError(`This step needs ${key ?? "a value"}, which is not available.`);
  }
  return scope[key];
}

export function applyTransform(
  operation: TransformOperation,
  scope: Record<string, string>,
  options: { sourceKey?: string; template?: string; decimals?: number },
) {
  if (operation === "template") {
    const template = options.template ?? "";
    if (!template) throw new EngineError("The template is empty.");
    return template.replace(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g, (_match, key: string) => {
      if (scope[key] === undefined) throw new EngineError(`The template needs ${key}, which is not available.`);
      return scope[key];
    });
  }

  const source = need(scope, options.sourceKey);
  if (operation === "uppercase") return source.toUpperCase();
  if (operation === "lowercase") return source.toLowerCase();
  if (operation === "trim") return source.trim();
  if (operation === "title_case") {
    return source.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }
  if (operation === "number_list") {
    const items = source
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    if (items.length === 0) throw new EngineError("The list did not contain any items.");
    return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
  }
  if (!/^-?\d+(?:\.\d+)?$/.test(source)) throw new EngineError("Rounding needs a plain number.");
  const decimals = options.decimals ?? 0;
  return new Decimal(source).toFixed(decimals);
}
