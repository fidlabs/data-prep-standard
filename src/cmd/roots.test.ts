import roots from "./roots.js";

describe("testing roots function", () => {
  test("calling roots does not error", () => {
    expect(() => {
      roots("", {});
    }).not.toThrow();
  });
});

export {};
