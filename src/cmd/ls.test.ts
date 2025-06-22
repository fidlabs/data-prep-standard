import ls from "./ls.js";

describe("testing ls function", () => {
  test("calling ls does not error", () => {
    expect(() => {
      ls("", {});
    }).not.toThrow();
  });
});
