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
        "testing/inputs/packs/basic/piece-bafybeibwsqk627ep3eddsnn6pdifho6bzdfi3cwve2tmx5icpx3y5ys524.car",
      ]);
      console.log("stdout:", stdout);
    }).not.toThrow();
  });
});
