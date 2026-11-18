/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExploreResults } from "./explore-results";

afterEach(() => cleanup());

const base = {
  workflows: [],
  query: "",
  category: "all",
  publishedCount: 0,
};

describe("ExploreResults", () => {
  it("says the library is empty instead of inventing recipes", () => {
    render(<ExploreResults result={{ ...base, status: "empty-library" }} />);
    expect(screen.getByRole("heading", { name: "The library is empty" })).toBeTruthy();
    expect(screen.getByText(/not filling the gap with sample cards/i)).toBeTruthy();
  });

  it("explains a search miss", () => {
    render(
      <ExploreResults
        result={{ ...base, status: "empty-search", query: "zzzz", publishedCount: 2 }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Nothing matches" })).toBeTruthy();
    expect(screen.getByText(/zzzz/)).toBeTruthy();
  });
});
