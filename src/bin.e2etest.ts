import assert from "node:assert";

import { execaSync } from "execa";

const binPath = "./dist/bin.js";

describe("CLI", function () {
  it("fails when no command", () => {
    assert.throws(() => execaSync(binPath));
  });

  it("ls succeeds", () => {
    assert.doesNotThrow(() => execaSync(binPath, ["ls", "path/to/car"]));
  });

  it("pack succeeds", () => {
    assert.doesNotThrow(() =>
      execaSync(binPath, [
        "pack",
        "-m",
        "testing/inputs/metadata/basic.json",
        "-o",
        "testing/outputs/pack",
        "testing/inputs/files/basic",
      ])
    );
  });

  it("unpack succeeds", () => {
    assert.doesNotThrow(() =>
      execaSync(binPath, [
        "unpack",
        "-o",
        "testing/outputs/unpack",
        "testing/inputs/packs/basic",
      ])
    );
  });

  it("verify succeeds", () => {
    assert.doesNotThrow(() =>
      execaSync(binPath, ["verify", "path/to/car1", "path/to/car2"])
    );
  });
});
