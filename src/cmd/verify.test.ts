import verify from "./verify.js";

describe("testing verify function", () => {
  test("calling verify does not error", async () => {
    await expect(
      verify(
        [
          "testing/inputs/packs/basic/piece-bafybeibwsqk627ep3eddsnn6pdifho6bzdfi3cwve2tmx5icpx3y5ys524.car",
        ],
        { verbose: false }
      )
    ).resolves.not.toThrow();
  });

  test("calling verify verbose does not error", async () => {
    await expect(
      verify(
        [
          "testing/inputs/packs/basic/piece-bafybeibwsqk627ep3eddsnn6pdifho6bzdfi3cwve2tmx5icpx3y5ys524.car",
        ],
        { verbose: true }
      )
    ).resolves.not.toThrow();
  });

  test("calling verify with super manifest does not error", async () => {
    await expect(
      verify(
        [
          "testing/inputs/packs/basic/piece-bafybeibwsqk627ep3eddsnn6pdifho6bzdfi3cwve2tmx5icpx3y5ys524.car",
        ],
        {
          superManifest: "testing/inputs/packs/basic/manifest.json",
          verbose: false,
        }
      )
    ).resolves.not.toThrow();
  });
});
