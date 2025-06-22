import assert from "node:assert";

import { execaSync } from "execa";

const binPath = "./dist/bin.js";

describe("CLI", function () {
  it("fails when no command", () => {
    assert.throws(() => execaSync(binPath));
  });

  it("blocks succeeds", () => {
    assert.doesNotThrow(() => execaSync(binPath, ["blocks"]));
  });

  it("hash succeeds", () => {
    assert.doesNotThrow(() => execaSync(binPath, ["hash"]));
  });

  it("join succeeds", () => {
    assert.doesNotThrow(() => execaSync(binPath, ["join"]));
  });

  it("ls succeeds", () => {
    assert.doesNotThrow(() => execaSync(binPath, ["ls"]));
  });

  it("pack succeeds", () => {
    assert.doesNotThrow(() => execaSync(binPath, ["pack"]));
  });

  it("roots succeeds", () => {
    assert.doesNotThrow(() => execaSync(binPath, ["roots"]));
  });

  it("split succeeds", () => {
    assert.doesNotThrow(() => execaSync(binPath, ["split"]));
  });

  it("unpack succeeds", () => {
    assert.doesNotThrow(() => execaSync(binPath, ["unpack"]));
  });
});
