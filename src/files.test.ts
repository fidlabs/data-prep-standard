/* eslint-disable n/no-unsupported-features/node-builtins */
import { Readable } from "node:stream";

import { describe, expect, jest, test } from "@jest/globals";

jest.unstable_mockModule("files-from-path", () => ({
  filesFromPaths: jest.fn(),
}));

const { filesFromPaths } = await import("files-from-path");
const mocked_filesFromPaths = filesFromPaths as jest.Mock<
  typeof filesFromPaths
>;

const { iterateFilesFromPathsWithSize } = await import("./files.js");

describe("testing files functions", () => {
  test("simple happy day", async () => {
    mocked_filesFromPaths.mockImplementationOnce(async (paths, options) => {
      expect(paths).toEqual(expect.arrayContaining(["test"]));
      expect(options).toBeUndefined();
      return new Promise((resolve) => {
        resolve([
          {
            name: "file1.txt",
            stream: () => Readable.toWeb(Readable.from("Hello World")),
            size: 11,
          },
          {
            name: "file2.txt",
            stream: () => Readable.toWeb(Readable.from("Another file")),
            size: 13,
          },
        ]);
      });
    });

    const generator = iterateFilesFromPathsWithSize(["test"]);

    const files1 = await generator.next();
    expect(files1.done).toBeFalsy();
    expect(files1.value).toBeDefined();

    if (files1.value) {
      expect(files1.value).toHaveLength(2);
      expect(files1.value[0]?.name).toBe("file1.txt");
      expect(files1.value[1]?.name).toBe("file2.txt");
    }

    const files2 = await generator.next();
    expect(files2.done).toBeTruthy();
    expect(files2.value).toBeUndefined();
  });

  test("split list happy day", async () => {
    mocked_filesFromPaths.mockImplementationOnce(async (paths, options) => {
      expect(paths).toEqual(expect.arrayContaining(["test"]));
      expect(options).toBeUndefined();
      return new Promise((resolve) => {
        resolve([
          {
            name: "file1.txt",
            stream: () => Readable.toWeb(Readable.from("Hello World")),
            size: 11,
          },
          {
            name: "file2.txt",
            stream: () => Readable.toWeb(Readable.from("Another file")),
            size: 13,
          },
        ]);
      });
    });

    const generator = iterateFilesFromPathsWithSize(["test"], 13);

    const files1 = await generator.next();
    expect(files1.done).toBeFalsy();
    expect(files1.value).toBeDefined();

    if (files1.value) {
      expect(files1.value).toHaveLength(1);
      expect(files1.value[0]?.name).toBe("file1.txt");
    }

    const files2 = await generator.next();
    expect(files2.done).toBeFalsy();
    expect(files2.value).toBeDefined();

    if (files2.value) {
      expect(files2.value).toHaveLength(1);
      expect(files2.value[0]?.name).toBe("file2.txt");
    }

    const files3 = await generator.next();
    expect(files3.done).toBeTruthy();
    expect(files3.value).toBeUndefined();
  });

  test("split file too big", async () => {
    mocked_filesFromPaths.mockImplementationOnce(async (paths, options) => {
      expect(paths).toEqual(expect.arrayContaining(["test"]));
      expect(options).toBeUndefined();
      return new Promise((resolve) => {
        resolve([
          {
            name: "file1.txt",
            stream: () => Readable.toWeb(Readable.from("Hello World")),
            size: 11,
          },
          {
            name: "file2.txt",
            stream: () => Readable.toWeb(Readable.from("Another file")),
            size: 13,
          },
        ]);
      });
    });

    const generator = iterateFilesFromPathsWithSize(["test"], 12);

    const files1 = await generator.next();
    expect(files1.done).toBeFalsy();
    expect(files1.value).toBeDefined();

    if (files1.value) {
      expect(files1.value).toHaveLength(1);
      expect(files1.value[0]?.name).toBe("file1.txt");
    }

    await expect(generator.next()).rejects.toThrow(
      "File file2.txt is too large (13 bytes) to fit in a single batch of 12 bytes."
    );
  });
});
