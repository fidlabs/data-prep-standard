import { describe, expect, test } from "@jest/globals";
import { execaSync } from "execa";

const binPath = "./dist/bin.js";

describe("CLI", function () {
  test("fails when no command", () => {
    expect(() => execaSync(binPath)).toThrow();
  });

  test("ls succeeds", () => {
    expect(() => execaSync(binPath, ["ls", "path/to/car"])).not.toThrow();
  });

  test("pack succeeds", () => {
    expect(() =>
      execaSync(binPath, [
        "pack",
        "-m",
        "testing/inputs/metadata/basic.json",
        "-o",
        "testing/outputs/pack",
        "testing/inputs/files/basic",
      ])
    ).not.toThrow();
  });

  test("unpack succeeds", () => {
    expect(() =>
      execaSync(binPath, [
        "unpack",
        "-o",
        "testing/outputs/unpack",
        "testing/inputs/packs/basic",
      ])
    ).not.toThrow();
  });

  test("verify succeeds", () => {
    expect(() =>
      execaSync(binPath, ["verify", "path/to/car1", "path/to/car2"])
    ).not.toThrow();
  });
});
