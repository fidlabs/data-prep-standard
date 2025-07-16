/* eslint-disable n/no-unsupported-features/node-builtins */
import { cwd } from "node:process";
import { Readable } from "node:stream";

import { describe, expect, jest, test } from "@jest/globals";
import { memfs } from "memfs";

import type { SplitFileLike } from "../files.js";

const { fs, vol } = memfs();

jest.unstable_mockModule("node:fs", () => ({
  ...fs,
}));

jest.unstable_mockModule("node:fs/promises", () => ({
  ...fs.promises,
}));

jest.unstable_mockModule("../files.js", () => ({
  iterateFilesFromPathsWithSize: jest.fn(),
}));

const { iterateFilesFromPathsWithSize } = await import("../files.js");
const mocked_iterateFilesFromPathsWithSize =
  iterateFilesFromPathsWithSize as jest.Mock<
    typeof iterateFilesFromPathsWithSize
  >;


const { default: pack } = await import("./pack.js");

const basicUserMetadata = {
  name: "test",
  description: "test desc",
  version: "2025/04/16",
  license: "MIT",
  project_url: "https://test.org",
  open_with: "browser",
};

const basicFilesGenerator = async function* (
  paths: string[]
): AsyncGenerator<SplitFileLike[], void, void> {
  expect(paths).toEqual(expect.arrayContaining(["test"]));
  const files = await new Promise<SplitFileLike[]>((resolve) => {
    resolve([
      {
        name: "file1.txt",
        originalName: "file1.txt",
        offset: 0,
        stream: () => Readable.toWeb(Readable.from("Hello World")),
        size: 11,
      },
      {
        name: "file2.txt",
        originalName: "file2.txt",
        offset: 0,
        stream: () => Readable.toWeb(Readable.from("Another file")),
        size: 13,
      },
    ]);
  });
  yield files;
};

describe("testing pack function", () => {
  beforeEach(() => {
    vol.reset();
    vol.mkdirSync(cwd(), { recursive: true });
    fs.writeFileSync(
      "basicUserMetadata.json",
      JSON.stringify(basicUserMetadata)
    );
  });

  test("calling pack does not error", async () => {
    mocked_iterateFilesFromPathsWithSize.mockImplementationOnce(
      basicFilesGenerator
    );

    await expect(
      pack(["test"], {
        output: "outdir",
        metadata: "basicUserMetadata.json",
        specVersion: "0.1.0",
      })
    ).resolves.not.toThrow();
  });

  test("bad spec version", async () => {
    await expect(
      pack(["test"], {
        output: "outdir",
        metadata: "basicUserMetadata.json",
        specVersion: "6.6.6",
      })
    ).rejects.toThrow();
  });
});
