import { describe, expect, test } from "@jest/globals";
import { execaSync } from "execa";

const binPath = "./dist/bin.js";

describe("ls", function () {
  test("with root succeeds", () => {
    expect(() =>
      execaSync(binPath, [
        "ls",
        "-r",
        "bafybeidh7dkgpt5u6cgpywlxkimm2wzuc5cerksvovkd5asagdhuottl2i",
        "testing/inputs/packs/basic/piece-bafybeibwsqk627ep3eddsnn6pdifho6bzdfi3cwve2tmx5icpx3y5ys524.car",
      ])
    ).not.toThrow();
  });

  test("with missing root fails", () => {
    expect(() =>
      execaSync(binPath, [
        "ls",
        "-r",
        "bafkreiajkbmpugz75eg2tmocmp3e33sg5kuyq2amzngslahgn6ltmqxxfa",
        "testing/inputs/packs/basic/piece-bafybeibwsqk627ep3eddsnn6pdifho6bzdfi3cwve2tmx5icpx3y5ys524.car",
      ])
    ).toThrow();
  });
});
