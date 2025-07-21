/* eslint-disable n/no-unsupported-features/node-builtins */
import { ReadStream } from "node:fs";
import { Readable } from "node:stream";
import { text } from "node:stream/consumers";

import { describe, expect, jest, test } from "@jest/globals";

jest.unstable_mockModule("files-from-path", () => ({
  filesFromPaths: jest.fn(),
}));

const { filesFromPaths } = await import("files-from-path");
const mocked_filesFromPaths = filesFromPaths as jest.Mock<
  typeof filesFromPaths
>;

jest.unstable_mockModule("node:fs", () => ({
  createReadStream: jest.fn(),
}));

const { createReadStream } = await import("node:fs");
const mocked_createReadStream = createReadStream as jest.Mock<
  typeof createReadStream
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
      expect(files1.value[0]).toBeDefined();
      if (files1.value[0]) {
        expect(files1.value[0].name).toBe("file1.txt");
        expect(await text(files1.value[0].stream())).toBe("Hello World");
        expect(files1.value[0].originalInfo).toBeUndefined();
      }
      expect(files1.value[1]).toBeDefined();
      if (files1.value[1]) {
        expect(files1.value[1].name).toBe("file2.txt");
        expect(await text(files1.value[1].stream())).toBe("Another file");
        expect(files1.value[1].originalInfo).toBeUndefined();
      }
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
            stream: () => Readable.toWeb(Readable.from("Final file")),
            size: 10,
          },
        ]);
      });
    });

    const generator = iterateFilesFromPathsWithSize(["test"], 11);

    const files1 = await generator.next();
    expect(files1.done).toBeFalsy();
    expect(files1.value).toBeDefined();

    if (files1.value) {
      expect(files1.value).toHaveLength(1);
      expect(files1.value[0]).toBeDefined();
      if (files1.value[0]) {
        expect(files1.value[0].name).toBe("file1.txt");
        expect(await text(files1.value[0].stream())).toBe("Hello World");
        expect(files1.value[0].originalInfo).toBeUndefined();
      }
    }

    const files2 = await generator.next();
    expect(files2.done).toBeFalsy();
    expect(files2.value).toBeDefined();

    if (files2.value) {
      expect(files2.value).toHaveLength(1);
      expect(files2.value[0]).toBeDefined();
      if (files2.value[0]) {
        expect(files2.value[0].name).toBe("file2.txt");
        expect(await text(files2.value[0].stream())).toBe("Final file");
        expect(files2.value[0].originalInfo).toBeUndefined();
      }
    }

    const files3 = await generator.next();
    expect(files3.done).toBeTruthy();
    expect(files3.value).toBeUndefined();
  });

  test("split file", async () => {
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
    mocked_createReadStream.mockImplementation(
      (_name, options) =>
        Readable.from(
          "Another file".slice(
            (options as undefined | { start?: number })?.start,
            (options as undefined | { end?: number })?.end
          )
        ) as ReadStream
    );

    const generator = iterateFilesFromPathsWithSize(["test"], 12);

    const files1 = await generator.next();
    expect(files1.done).toBeFalsy();
    expect(files1.value).toBeDefined();

    if (files1.value) {
      expect(files1.value).toHaveLength(2);
      expect(files1.value[0]).toBeDefined();
      if (files1.value[0]) {
        expect(files1.value[0].name).toBe("file1.txt");
        expect(await text(files1.value[0].stream())).toBe("Hello World");
        expect(files1.value[0].name).toBe("file1.txt");
        expect(files1.value[0].originalInfo).toBeUndefined();
      }
      expect(files1.value[1]).toBeDefined();
      if (files1.value[1]) {
        expect(files1.value[1].name).toBe("file2.txt.part.0");
        expect(await text(files1.value[1].stream())).toBe("A");
        expect(files1.value[1].originalInfo?.name).toBe("file2.txt");
      }
    }

    const files2 = await generator.next();
    expect(files2.done).toBeFalsy();
    expect(files2.value).toBeDefined();

    if (files2.value) {
      expect(files2.value).toHaveLength(1);
      expect(files2.value[0]).toBeDefined();
      if (files2.value[0]) {
        expect(files2.value[0].name).toBe("file2.txt.part.1");
        expect(await text(files2.value[0].stream())).toBe("nother file");
        expect(files2.value[0].originalInfo?.name).toBe("file2.txt");
      }
    }

    const files3 = await generator.next();
    expect(files3.done).toBeTruthy();
    expect(files3.value).toBeUndefined();
  });

  test("split tiny files", async () => {
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

    const generator = iterateFilesFromPathsWithSize(["test"], 1);

    for (let i = 0; i < 11; i++) {
      const files1 = await generator.next();
      expect(files1.done).toBeFalsy();
      expect(files1.value).toBeDefined();

      if (files1.value) {
        expect(files1.value).toHaveLength(1);
        expect(files1.value[0]?.name).toBe(
          `file1.txt.part.${i.toString().padStart(2, "0")}`
        );
        expect(files1.value[0]?.originalInfo?.name).toBe("file1.txt");
      }
    }

    for (let i = 0; i < 13; i++) {
      const files1 = await generator.next();
      expect(files1.done).toBeFalsy();
      expect(files1.value).toBeDefined();

      if (files1.value) {
        expect(files1.value).toHaveLength(1);
        expect(files1.value[0]?.name).toBe(
          `file2.txt.part.${i.toString().padStart(2, "0")}`
        );
        expect(files1.value[0]?.originalInfo?.name).toBe("file2.txt");
      }
    }
    const files3 = await generator.next();
    expect(files3.done).toBeTruthy();
    expect(files3.value).toBeUndefined();
  });
});
