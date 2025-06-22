import split from "./split.js";

describe("testing split function", () => {
  test("calling split does not error", () => {
    expect(() => {
      split("", {});
    }).not.toThrow();
  });
});
