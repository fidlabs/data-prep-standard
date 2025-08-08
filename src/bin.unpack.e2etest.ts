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
        "testing/inputs/packs/basic/piece-bafybeie7poazgv7xo4ec7zg6twnuec6qinb3jwqmv6tgu3gbb6olbhlh6q.car",
      ]);
      console.log("stdout:", stdout);
    }).not.toThrow();
  });
});
