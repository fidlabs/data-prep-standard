import { describe, expect, test } from "@jest/globals";

import { specFromVersion } from "./manifest.js";

function specStringWithVersion(version: string): string {
  return `https://raw.githubusercontent.com/fidlabs/data-prep-standard/refs/heads/main/specification/v${version}/FilecoinDataPreparationManifestSpecification.md`;
}

describe("spec link from version", () => {
  test("simple happy day", () => {
    expect(specFromVersion("0.9.3")).toBe(specStringWithVersion("0"));
    expect(specFromVersion("4.1.1")).toBe(specStringWithVersion("4"));
    expect(specFromVersion("0.99.999999")).toBe(specStringWithVersion("0"));
    expect(specFromVersion("92345.99.999999")).toBe(specStringWithVersion("92345"));
  });

  test("simple sad day", () => {
    expect(() => specFromVersion("v1.0.0")).toThrow();
    expect(() => specFromVersion("1.0.0.0")).toThrow();
    expect(() => specFromVersion("1.0")).toThrow();
    expect(() => specFromVersion("1")).toThrow();
    expect(() => specFromVersion("1a.0.0")).toThrow();
  });
});
