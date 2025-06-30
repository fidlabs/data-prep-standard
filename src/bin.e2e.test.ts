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
        "path/to/metadata.json",
        "-o",
        "path/to/output",
        "path/to/file1",
        "path/to/file2",
      ])
    );
  });

  it("unpack succeeds", () => {
    assert.doesNotThrow(() =>
      execaSync(binPath, [
        "unpack",
        "-o",
        "path/to/output",
        "path/to/car1",
        "path/to/car2",
      ])
    );
  });

  it("verify succeeds", () => {
    assert.doesNotThrow(() =>
      execaSync(binPath, ["verify", "path/to/car1", "path/to/car2"])
    );
  });
});
