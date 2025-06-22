import hash from "./hash.js";

describe("testing hash function", () => {
  test("calling hash does not error", () => {
    expect(() => {
      hash("");
    }).not.toThrow();
  });
});
