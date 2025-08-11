import ls from "./ls.js";

describe("testing ls function", () => {
  test("calling ls does not error", async () => {
    await expect(
      ls(
        "testing/inputs/packs/basic/piece-bafybeie7poazgv7xo4ec7zg6twnuec6qinb3jwqmv6tgu3gbb6olbhlh6q.car",
        { verbose: false }
      )
    ).resolves.not.toThrow();
  });
});
