import verify from "./verify.js";

describe("testing verify function", () => {
  test("calling verify does not error", async () => {
    await expect(
      verify(
        [
          "testing/inputs/packs/basic/piece-bafybeie7poazgv7xo4ec7zg6twnuec6qinb3jwqmv6tgu3gbb6olbhlh6q.car",
        ],
        { verbose: false }
      )
    ).resolves.not.toThrow();
  });

  test("calling verify verbose does not error", async () => {
    await expect(
      verify(
        [
          "testing/inputs/packs/basic/piece-bafybeie7poazgv7xo4ec7zg6twnuec6qinb3jwqmv6tgu3gbb6olbhlh6q.car",
        ],
        { verbose: true }
      )
    ).resolves.not.toThrow();
  });

  test("calling verify with super manifest does not error", async () => {
    await expect(
      verify(
        [
          "testing/inputs/packs/basic/piece-bafybeie7poazgv7xo4ec7zg6twnuec6qinb3jwqmv6tgu3gbb6olbhlh6q.car",
        ],
        {
          superManifest: "testing/inputs/packs/basic/manifest.json",
          verbose: false,
        }
      )
    ).resolves.not.toThrow();
  });
});
