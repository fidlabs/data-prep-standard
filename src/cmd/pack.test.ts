import pack from "./pack.js";

describe("testing pack function", () => {
  test("calling pack does not error", () => {
    expect(() => {
      pack("", {});
    }).not.toThrow();
  });
});
