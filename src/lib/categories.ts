export const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "everyday-math", label: "Everyday math" },
  { id: "text-tools", label: "Text tools" },
  { id: "demo-forms", label: "Saved notes" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORIES.some((category) => category.id === value);
}

export function categoryLabel(id: string) {
  return CATEGORIES.find((category) => category.id === id)?.label ?? id;
}
