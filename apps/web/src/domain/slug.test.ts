import { describe, it, expect } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("trims edges", () => {
    expect(slugify("  My Title  ")).toBe("my-title");
  });
});
