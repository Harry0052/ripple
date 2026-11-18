export const NAV_ITEMS = [
  {
    href: "/",
    label: "Explore",
    available: true,
    reason: "Search the public recipe library.",
  },
  {
    href: "#not-built",
    label: "My Runs",
    available: false,
    reason: "Run history is not built yet.",
  },
  {
    href: "#not-built",
    label: "Create",
    available: false,
    reason: "The recipe editor is not built yet.",
  },
  {
    href: "#not-built",
    label: "Profile",
    available: false,
    reason: "Accounts are not built yet.",
  },
] as const;
