import verify from "./verify.js";

describe("testing verify function", () => {
  test("calling verify does not error", () => {
    expect(() => {
      verify([""]);
    }).not.toThrow();
  });
});
