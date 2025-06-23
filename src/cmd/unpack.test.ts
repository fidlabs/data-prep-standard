import unpack from "./unpack.js";

describe("testing unpack function", () => {
  test("calling unpack does not error", () => {
    expect(() => {
      unpack("", {});
    }).not.toThrow();
  });
});
