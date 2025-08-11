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
        "testing/inputs/packs/basic/piece-bafybeie7poazgv7xo4ec7zg6twnuec6qinb3jwqmv6tgu3gbb6olbhlh6q.car",
      ])
    ).not.toThrow();
  });

  test("with missing root fails", () => {
    expect(() =>
      execaSync(binPath, [
        "ls",
        "-r",
        "bafkreiajkbmpugz75eg2tmocmp3e33sg5kuyq2amzngslahgn6ltmqxxfa",
        "testing/inputs/packs/basic/piece-bafybeie7poazgv7xo4ec7zg6twnuec6qinb3jwqmv6tgu3gbb6olbhlh6q.car",
      ])
    ).toThrow();
  });
});
