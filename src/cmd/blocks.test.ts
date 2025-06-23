import blocks from "./blocks.js";

describe("testing blocks function", () => {
  test("calling blocks does not error", () => {
    expect(() => {
      blocks("", {});
    }).not.toThrow();
  });
});
