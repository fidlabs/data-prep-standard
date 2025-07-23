import { describe, expect, test } from "@jest/globals";

import parse from "./parseBytes.js";

describe("parse number of bytes", () => {
  test("simple happy day", () => {
    expect(parse("2B")).toBe(2);
    expect(parse("17.3b")).toBe(17);
    expect(parse("1")).toBe(1);
    expect(parse("10.4 B")).toBe(10);
    expect(parse("99 K")).toBe(101376);
    expect(parse("705 KB")).toBe(721920);
    expect(parse("11.7Mb")).toBe(12268339);
    expect(parse("5.5 MiB")).toBe(5767168);
    expect(parse("0.95G")).toBe(1020054733);
    expect(parse("8Gb")).toBe(8589934592);
    expect(parse("2.745 TB")).toBe(3018159418245);
    expect(parse("999.99T")).toBe(1099500632659722);
    expect(parse("3.5 P")).toBe(3940649673949184);
    expect(parse("0.8001000 Pib")).toBe(900832515464784);
  });

  test("simple sad day", () => {
    expect(() => parse("3.5 Dogs")).toThrow();
    expect(() => parse("3.5.8 k")).toThrow();
    expect(() => parse("3K5")).toThrow();
  });
});
