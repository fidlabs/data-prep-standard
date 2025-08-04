import { join } from "node:path";
import { cwd } from "node:process";

import { describe, expect, jest, test } from "@jest/globals";
import { memfs } from "memfs";

const { fs, vol } = memfs();

jest.unstable_mockModule("node:fs", () => ({
  ...fs,
}));

jest.unstable_mockModule("node:fs/promises", () => ({
  ...fs.promises,
}));

const { default: pack } = await import("./pack.js");

const basicUserMetadata = {
  name: "test",
  description: "test desc",
  version: "2025/04/16",
  license: "MIT",
  project_url: "https://test.org",
  open_with: "browser",
};

describe("testing pack function", () => {
  beforeEach(() => {
    vol.reset();
    vol.mkdirSync(join(cwd(), "test"), { recursive: true });
    fs.writeFileSync(
      "basicUserMetadata.json",
      JSON.stringify(basicUserMetadata)
    );
    fs.writeFileSync(join(cwd(), "test", "file1.txt"), "Hello World");
    fs.writeFileSync(join(cwd(), "test", "file2.txt"), "Another file");
  });

  test("calling pack does not error", async () => {
    await expect(
      pack(["test"], {
        output: "outdir",
        metadata: "basicUserMetadata.json",
        specVersion: "0.1.0",
        targetCarSize: "31GiB",
      })
    ).resolves.not.toThrow();

    const manifestContent = fs.readFileSync(
      "outdir/manifest.json",
      "utf-8"
    ) as string;
    console.log("manifestContent", manifestContent);
    expect(JSON.parse(manifestContent)).toEqual(
      expect.objectContaining({
        "@spec":
          "https://raw.githubusercontent.com/fidlabs/data-prep-standard/refs/heads/main/specification/v0/FilecoinDataPreparationManifestSpecification.md",
        "@spec_version": "0.1.0",
        uuid: expect.any(String),
        name: "test",
        description: "test desc",
        version: "2025/04/16",
        license: "MIT",
        project_url: "https://test.org",
        open_with: "browser",
        n_pieces: 1,
        pieces: expect.arrayContaining([
          expect.objectContaining({
            piece_cid: expect.any(String),
            payload_cid: expect.any(String),
          }),
        ]),
        contents: expect.arrayContaining([
          expect.objectContaining({
            "@type": "file",
            name: "file1.txt",
            byte_length: 11,
            hash: expect.any(String),
            cid: expect.any(String),
            piece_cid: expect.any(String),
          }),
          expect.objectContaining({
            "@type": "file",
            name: "file2.txt",
            byte_length: 12,
            hash: expect.any(String),
            cid: expect.any(String),
            piece_cid: expect.any(String),
          }),
        ]),
      })
    );
  });

  test("bad spec version", async () => {
    await expect(
      pack(["test"], {
        output: "outdir",
        metadata: "basicUserMetadata.json",
        specVersion: "6.6.6",
        targetCarSize: "31GiB",
      })
    ).rejects.toThrow();
  });

  test("no lite with split files", async () => {
    await expect(
      pack(["test"], {
        output: "outdir",
        metadata: "basicUserMetadata.json",
        specVersion: "0.1.0",
        lite: true,
        targetCarSize: "4B",
      })
    ).rejects.toThrow();
  });
});
