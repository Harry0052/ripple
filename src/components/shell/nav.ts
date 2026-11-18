export const NAV_ITEMS = [
  {
    href: "/",
    label: "Explore",
    available: true,
    reason: "Search the public recipe library.",
  },
  {
    href: "/runs",
    label: "My Runs",
    available: true,
    reason: "Your private run history.",
  },
  {
    href: "/create",
    label: "Create",
    available: true,
    reason: "Write and publish a recipe.",
  },
  {
    href: "/profile",
    label: "Profile",
    available: true,
    reason: "The session stored in this browser.",
  },
] as const;
