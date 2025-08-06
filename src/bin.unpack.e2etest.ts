import { describe, expect, test } from "@jest/globals";
import { execaSync } from "execa";

const binPath = "./dist/bin.js";

describe("unpack", function () {
  test("unpack with super manifest", () => {
    expect(() => {
      const { stdout } = execaSync(binPath, [
        "unpack",
        "-s",
        "testing/inputs/packs/basic/manifest.json",
        "-o",
        "testing/outputs/unpack.e2e.basic",
        "testing/inputs/packs/basic/piece-bafybeihfmvwkwudm6jdqnknqrzc4h52pz2kru24alg6pchcqxwu2vfamqu.car",
      ]);
      console.log("stdout:", stdout);
    }).not.toThrow();
  });
});
