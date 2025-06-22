import join from "./join.js";

describe("testing join function", () => {
  test("calling join does not error", () => {
    expect(() => {
      join([""], {});
    }).not.toThrow();
  });
});
