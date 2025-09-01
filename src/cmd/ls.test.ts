import ls from "./ls.js";

describe("testing ls function", () => {
  test("calling ls does not error", async () => {
    await expect(
      ls(
        "testing/inputs/packs/basic/piece-bafybeibwsqk627ep3eddsnn6pdifho6bzdfi3cwve2tmx5icpx3y5ys524.car",
        { verbose: false }
      )
    ).resolves.not.toThrow();
  });

  test("calling ls verbose does not error", async () => {
    await expect(
      ls(
        "testing/inputs/packs/basic/piece-bafybeibwsqk627ep3eddsnn6pdifho6bzdfi3cwve2tmx5icpx3y5ys524.car",
        { verbose: true }
      )
    ).resolves.not.toThrow();
  });
});
