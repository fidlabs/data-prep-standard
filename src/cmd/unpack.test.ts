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

  beforeEach(async () => {
    vol.reset();
    vol.mkdirSync(join(cwd(), "test"), { recursive: true });
    fs.writeFileSync(
      "basicUserMetadata.json",
      JSON.stringify(basicUserMetadata)
    );
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
    console.log(carFile);
  });

  test("calling unpack does not error", async () => {
    await expect(
      unpack([`outdir/${carFile}`], {
        output: "testing/outputs/unpack",
        verbose: false,
      })
    ).resolves.not.toThrow();
  });
});
