import { join } from "node:path";
import { cwd } from "node:process";

import { describe, expect, jest, test } from "@jest/globals";
import { memfs } from "memfs";

const { fs, vol } = memfs();

jest.unstable_mockModule("node:fs", () => ({
  ...fs,
}));

jest.unstable_mockModule("fs", () => ({
  default: {
    ...fs,
  },
}));

jest.unstable_mockModule("node:fs/promises", () => ({
  ...fs.promises,
}));

const { default: unpack } = await import("./unpack.js");
const { default: pack } = await import("./pack.js");

const basicUserMetadata = {
  name: "test",
  description: "test desc",
  version: "2025/04/16",
  license: "MIT",
  project_url: "https://test.org",
  open_with: "browser",
};

describe("testing unpack function", () => {
  let carFile: string;

  beforeEach(() => {
    vol.reset();
    vol.mkdirSync(join(cwd(), "test"), { recursive: true });
    fs.writeFileSync(
      "basicUserMetadata.json",
      JSON.stringify(basicUserMetadata)
    );
  });

  test("calling unpack does not error", async () => {
    fs.writeFileSync(join(cwd(), "test", "file1.txt"), "Hello World");
    fs.writeFileSync(join(cwd(), "test", "file2.txt"), "Another file");
    await pack(["test"], {
      output: "outdir",
      metadata: "basicUserMetadata.json",
      specVersion: "0.1.0",
      targetCarSize: "31GiB",
    });

    const file = vol.readdirSync("outdir").find((obj) => {
      return (obj as string).endsWith(".car");
    });
    expect(file).toBeDefined();
    carFile = (file as string | undefined) ?? "";

    await expect(
      unpack([`outdir/${carFile}`], {
        output: "testing/outputs/unpack",
        verbose: false,
      })
    ).resolves.not.toThrow();
  });

  test("unpack split files", async () => {
    fs.writeFileSync(join(cwd(), "test", "file1.txt"), "Hello World");
    fs.writeFileSync(join(cwd(), "test", "file2.txt"), "Another file");
    await pack(["test"], {
      output: "outdir",
      metadata: "basicUserMetadata.json",
      specVersion: "0.1.0",
      targetCarSize: "10",
    });

    const files = vol.readdirSync("outdir").filter((obj) => {
      return (obj as string).endsWith(".car");
    });
    expect(files).toBeDefined();
    expect(files).toHaveLength(3);

    await expect(
      unpack(
        files.map((f) => join("outdir", f as string)),
        {
          output: "testing/outputs/unpack",
          verbose: false,
        }
      )
    ).resolves.not.toThrow();

    const partRegex = /\.part\.[0-9]+$/;
    const badFiles = vol.readdirSync("testing/outputs/unpack").filter((obj) => {
      return partRegex.exec(obj as string);
    });
    expect(badFiles).toBeDefined();
    expect(badFiles).toHaveLength(0);
  });
});
