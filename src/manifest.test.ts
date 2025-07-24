import { describe, expect, test } from "@jest/globals";
import { CID } from "multiformats";

import { Manifest, specFromVersion } from "./manifest.js";

function specStringWithVersion(version: string): string {
  return `https://raw.githubusercontent.com/fidlabs/data-prep-standard/refs/heads/main/specification/v${version}/FilecoinDataPreparationManifestSpecification.md`;
}

describe("spec link from version", () => {
  test("simple happy day", () => {
    expect(specFromVersion("0.9.3")).toBe(specStringWithVersion("0"));
    expect(specFromVersion("4.1.1")).toBe(specStringWithVersion("4"));
    expect(specFromVersion("0.99.999999")).toBe(specStringWithVersion("0"));
    expect(specFromVersion("92345.99.999999")).toBe(
      specStringWithVersion("92345")
    );
  });

  test("simple sad day", () => {
    expect(() => specFromVersion("v1.0.0")).toThrow();
    expect(() => specFromVersion("1.0.0.0")).toThrow();
    expect(() => specFromVersion("1.0")).toThrow();
    expect(() => specFromVersion("1")).toThrow();
    expect(() => specFromVersion("1a.0.0")).toThrow();
  });
});

describe("super manifest", () => {
  test("basic create", () => {
    const manifest = new Manifest(
      {
        name: "Test Manifest",
        description: "This is a test manifest",
        version: "1.0.0",
        license: "MIT",
        project_url: "https://example.com",
        open_with: "test-app",
        tags: ["test", "manifest"],
      },
      "0.1.0"
    );

    expect(manifest["@spec_version"]).toBe("0.1.0");
    expect(manifest["@spec"]).toBe(specStringWithVersion("0"));
    expect(manifest.name).toBe("Test Manifest");
    expect(manifest.description).toBe("This is a test manifest");
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.license).toBe("MIT");
    expect(manifest.project_url).toBe("https://example.com");
    expect(manifest.open_with).toBe("test-app");
    expect(manifest.tags).toEqual(["test", "manifest"]);
    expect(manifest.n_pieces).toBe(0);
    expect(manifest.pieces).toEqual([]);
    expect(manifest.uuid).toEqual(expect.any(String));
    expect(manifest.contents).toBeUndefined();
  });

  test("sub manifest creation", () => {
    const manifest = new Manifest(
      {
        name: "Test Manifest",
        description: "This is a test manifest",
        version: "1.0.0",
        license: "MIT",
        project_url: "https://example.com",
        open_with: "test-app",
        tags: ["test", "manifest"],
      },
      "0.1.0"
    );

    const subManifest = manifest.newSubManifest();
    expect(subManifest["@spec_version"]).toBe("0.1.0");
    expect(subManifest["@spec"]).toBe(specStringWithVersion("0"));
    expect(subManifest.name).toBe("Test Manifest");
    expect(subManifest.description).toBe("This is a test manifest");
    expect(subManifest.version).toBe("1.0.0");
    expect(subManifest.license).toBe("MIT");
    expect(subManifest.project_url).toBe("https://example.com");
    expect(subManifest.open_with).toBe("test-app");
    expect(subManifest.tags).toEqual(["test", "manifest"]);
    expect(subManifest.uuid).toEqual(expect.any(String));
  });

  test("piece with contents", () => {
    const manifest = new Manifest(
      {
        name: "Test Manifest",
        description: "This is a test manifest",
        version: "1.0.0",
        license: "MIT",
        project_url: "https://example.com",
        open_with: "test-app",
        tags: ["test", "manifest"],
      },
      "0.1.0"
    );

    const subManifest = manifest.newSubManifest();
    subManifest.contents = [
      {
        "@type": "file",
        name: "test.txt",
        cid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
        hash: "1234567890abcdef",
        byte_length: 1234,
      },
    ];

    manifest.addPiece(
      subManifest,
      CID.parse("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );

    expect(manifest.n_pieces).toBe(1);
    expect(manifest.pieces).toHaveLength(1);
    expect(manifest.pieces[0]).toEqual(
      expect.objectContaining({
        piece_cid:
          "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
        payload_cid:
          "bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u",
      })
    );
  });
});
