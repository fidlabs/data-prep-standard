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
    mocked_filesFromPaths.mockImplementationOnce(async (paths) => {
      expect(paths).toEqual(expect.arrayContaining(["test"]));
      return new Promise((resolve) => {
        resolve([
          {
            name: "file1.txt",
            stream: () => Readable.toWeb(Readable.from("Hello World")),
            size: 10,
          },
          {
            name: "file2.txt",
            stream: () => Readable.toWeb(Readable.from("Another file")),
            size: 12,
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
      expect(files1.value[0]).toEqual(
        expect.objectContaining({
          name: "file1.txt",
          size: 10,
          stream: expect.any(Function),
        })
      );
      if (files1.value[0]) {
        expect(await text(files1.value[0].stream())).toBe("Hello World");
      }
      expect(files1.value[1]).toEqual(
        expect.objectContaining({
          name: "file2.txt",
          size: 12,
          stream: expect.any(Function),
        })
      );
      if (files1.value[1]) {
        expect(await text(files1.value[1].stream())).toBe("Another file");
      }
    }

    const files2 = await generator.next();
    expect(files2.done).toBeTruthy();
    expect(files2.value).toBeUndefined();
  });

  test("split list happy day", async () => {
    mocked_filesFromPaths.mockImplementationOnce(async (paths) => {
      expect(paths).toEqual(expect.arrayContaining(["test"]));
      return new Promise((resolve) => {
        resolve([
          {
            name: "file1.txt",
            stream: () => Readable.toWeb(Readable.from("Hello World")),
            size: 10,
          },
          {
            name: "file2.txt",
            stream: () => Readable.toWeb(Readable.from("Final file")),
            size: 9,
          },
        ]);
      });
    });

    const generator = iterateFilesFromPathsWithSize(["test"], { nBytes: 11 });

    const files1 = await generator.next();
    expect(files1.done).toBeFalsy();
    expect(files1.value).toBeDefined();

    if (files1.value) {
      expect(files1.value).toHaveLength(1);
      expect(files1.value[0]).toEqual(
        expect.objectContaining({
          name: "file1.txt",
          size: 10,
          stream: expect.any(Function),
        })
      );
      if (files1.value[0]) {
        expect(await text(files1.value[0].stream())).toBe("Hello World");
      }
    }

    const files2 = await generator.next();
    expect(files2.done).toBeFalsy();
    expect(files2.value).toBeDefined();

    if (files2.value) {
      expect(files2.value).toHaveLength(1);
      expect(files2.value[0]).toEqual(
        expect.objectContaining({
          name: "file2.txt",
          size: 9,
          stream: expect.any(Function),
        })
      );
      if (files2.value[0]) {
        expect(await text(files2.value[0].stream())).toBe("Final file");
      }
    }

    const files3 = await generator.next();
    expect(files3.done).toBeTruthy();
    expect(files3.value).toBeUndefined();
  });

  test("split file", async () => {
    mocked_filesFromPaths.mockImplementationOnce(async (paths) => {
      expect(paths).toEqual(expect.arrayContaining(["test"]));
      return new Promise((resolve) => {
        resolve([
          {
            name: "file1.txt",
            stream: () => Readable.toWeb(Readable.from("Hello World")),
            size: 10,
          },
          {
            name: "file2.txt",
            stream: () => Readable.toWeb(Readable.from("Another file")),
            size: 12,
          },
        ]);
      });
    });
    mocked_createReadStream.mockImplementation((_name, options) => {
      const start = (options as undefined | { start?: number })?.start ?? 0;
      const end = ((options as undefined | { end?: number })?.end ?? 0) + 1;
      // end + 1 because the end is inclusive in the createReadStream options
      // and exclusive in the slice method
      return Readable.from("Another file".slice(start, end)) as ReadStream;
    });

    const generator = iterateFilesFromPathsWithSize(["test"], { nBytes: 11 });

    const files1 = await generator.next();
    expect(files1.done).toBeFalsy();
    expect(files1.value).toBeDefined();

    if (files1.value) {
      expect(files1.value).toHaveLength(2);
      expect(files1.value[0]).toEqual(
        expect.objectContaining({
          name: "file1.txt",
          size: 10,
          stream: expect.any(Function),
        })
      );
      if (files1.value[0]) {
        expect(await text(files1.value[0].stream())).toBe("Hello World");
      }
      expect(files1.value[1]).toEqual(
        expect.objectContaining({
          name: "file2.txt.part.0",
          originalInfo: {
            name: "file2.txt",
            size: 12,
            hash: expect.any(String),
          },
          size: 1,
          stream: expect.any(Function),
        })
      );
      if (files1.value[1]) {
        expect(await text(files1.value[1].stream())).toBe("A");
      }
    }

    const files2 = await generator.next();
    expect(files2.done).toBeFalsy();
    expect(files2.value).toBeDefined();

    if (files2.value) {
      expect(files2.value).toHaveLength(1);
      expect(files2.value[0]).toEqual(
        expect.objectContaining({
          name: "file2.txt.part.1",
          originalInfo: {
            name: "file2.txt",
            size: 12,
            hash: expect.any(String),
          },
          size: 11,
          stream: expect.any(Function),
        })
      );
      if (files2.value[0]) {
        expect(await text(files2.value[0].stream())).toBe("nother file");
      }
    }

    const files3 = await generator.next();
    expect(files3.done).toBeTruthy();
    expect(files3.value).toBeUndefined();
  });

  test("split tiny files", async () => {
    mocked_filesFromPaths.mockImplementationOnce(async (paths) => {
      expect(paths).toEqual(expect.arrayContaining(["test"]));
      return new Promise((resolve) => {
        resolve([
          {
            name: "file1.txt",
            stream: () => Readable.toWeb(Readable.from("Hello World")),
            size: 10,
          },
          {
            name: "file2.txt",
            stream: () => Readable.toWeb(Readable.from("Another file")),
            size: 12,
          },
        ]);
      });
    });
    mocked_createReadStream.mockImplementation((name, options) => {
      let content = "Hello World";
      if (name === "test/file2.txt") {
        content = "Another file";
      }
      const start = (options as undefined | { start?: number })?.start ?? 0;
      const end = ((options as undefined | { end?: number })?.end ?? 0) + 1;
      // end + 1 because the end is inclusive in the createReadStream options
      // and exclusive in the slice method
      return Readable.from(content.slice(start, end)) as ReadStream;
    });

    const generator = iterateFilesFromPathsWithSize(["test"], { nBytes: 1 });

    for (let i = 0; i < 10; i++) {
      const files1 = await generator.next();
      expect(files1.done).toBeFalsy();
      expect(files1.value).toBeDefined();

      if (files1.value) {
        expect(files1.value).toHaveLength(1);
        expect(files1.value[0]).toEqual(
          expect.objectContaining({
            name: `file1.txt.part.${i.toString().padStart(1, "0")}`,
            originalInfo: {
              name: "file1.txt",
              size: 10,
              hash: expect.any(String),
            },
            size: 1,
            stream: expect.any(Function),
          })
        );
        if (files1.value[0]) {
          expect(await text(files1.value[0].stream())).toBe("Hello World"[i]);
        }
      }
    }

    for (let i = 0; i < 12; i++) {
      const files1 = await generator.next();
      expect(files1.done).toBeFalsy();
      expect(files1.value).toBeDefined();

      if (files1.value) {
        expect(files1.value).toHaveLength(1);
        expect(files1.value[0]).toEqual(
          expect.objectContaining({
            name: `file2.txt.part.${i.toString().padStart(2, "0")}`,
            originalInfo: {
              name: "file2.txt",
              size: 12,
              hash: expect.any(String),
            },
            size: 1,
            stream: expect.any(Function),
          })
        );
        if (files1.value[0]) {
          expect(await text(files1.value[0].stream())).toBe("Another file"[i]);
        }
      }
    }
    const files3 = await generator.next();
    expect(files3.done).toBeTruthy();
    expect(files3.value).toBeUndefined();
  });

  test("multiple inputs", async () => {
    mocked_filesFromPaths.mockImplementationOnce(async (paths) => {
      expect(paths).toEqual(
        expect.arrayContaining(["common/test1", "common/test2"])
      );
      return new Promise((resolve) => {
        resolve([
          {
            name: "test1/file1.txt",
            stream: () => Readable.toWeb(Readable.from("Hello World")),
            size: 10,
          },
          {
            name: "test2/file2.txt",
            stream: () => Readable.toWeb(Readable.from("Another file")),
            size: 12,
          },
        ]);
      });
    });

    const generator = iterateFilesFromPathsWithSize([
      "common/test1",
      "common/test2",
    ]);

    const files1 = await generator.next();
    expect(files1.done).toBeFalsy();
    expect(files1.value).toBeDefined();

    if (files1.value) {
      expect(files1.value).toHaveLength(2);
      expect(files1.value[0]).toEqual(
        expect.objectContaining({
          name: "test1/file1.txt",
          size: 10,
          stream: expect.any(Function),
          media_type: "text/plain",
        })
      );
      if (files1.value[0]) {
        expect(await text(files1.value[0].stream())).toBe("Hello World");
      }
      expect(files1.value[1]).toEqual(
        expect.objectContaining({
          name: "test2/file2.txt",
          size: 12,
          stream: expect.any(Function),
          media_type: "text/plain",
        })
      );
      if (files1.value[1]) {
        expect(await text(files1.value[1].stream())).toBe("Another file");
      }
    }

    const files2 = await generator.next();
    expect(files2.done).toBeTruthy();
    expect(files2.value).toBeUndefined();
  });

  test("multiple deep inputs", async () => {
    mocked_filesFromPaths.mockImplementationOnce(async (paths) => {
      expect(paths).toEqual(
        expect.arrayContaining([
          "common/part/uncommon/test1",
          "common/part/differing/test2",
        ])
      );
      return new Promise((resolve) => {
        resolve([
          {
            name: "uncommon/test1/file1.txt",
            stream: () => Readable.toWeb(Readable.from("Hello World")),
            size: 10,
          },
          {
            name: "differing/test2/file2.txt",
            stream: () => Readable.toWeb(Readable.from("Another file")),
            size: 12,
          },
        ]);
      });
    });

    const generator = iterateFilesFromPathsWithSize([
      "common/part/uncommon/test1",
      "common/part/differing/test2",
    ]);

    const files1 = await generator.next();
    expect(files1.done).toBeFalsy();
    expect(files1.value).toBeDefined();

    if (files1.value) {
      expect(files1.value).toHaveLength(2);
      expect(files1.value[0]).toEqual(
        expect.objectContaining({
          name: "uncommon/test1/file1.txt",
          size: 10,
          stream: expect.any(Function),
          media_type: "text/plain",
        })
      );
      if (files1.value[0]) {
        expect(await text(files1.value[0].stream())).toBe("Hello World");
      }
      expect(files1.value[1]).toEqual(
        expect.objectContaining({
          name: "differing/test2/file2.txt",
          size: 12,
          stream: expect.any(Function),
          media_type: "text/plain",
        })
      );
      if (files1.value[1]) {
        expect(await text(files1.value[1].stream())).toBe("Another file");
      }
    }

    const files2 = await generator.next();
    expect(files2.done).toBeTruthy();
    expect(files2.value).toBeUndefined();
  });

  test("split files multiple input", async () => {
    mocked_filesFromPaths.mockImplementationOnce(async (paths) => {
      expect(paths).toEqual(expect.arrayContaining(["test1", "test2"]));
      return new Promise((resolve) => {
        resolve([
          {
            name: "test1/file1.txt",
            stream: () => Readable.toWeb(Readable.from("Hello World")),
            size: 10,
          },
          {
            name: "test2/file2.txt",
            stream: () => Readable.toWeb(Readable.from("Another file")),
            size: 12,
          },
        ]);
      });
    });
    mocked_createReadStream.mockImplementation((_name, options) => {
      const start = (options as undefined | { start?: number })?.start ?? 0;
      const end = ((options as undefined | { end?: number })?.end ?? 0) + 1;
      // end + 1 because the end is inclusive in the createReadStream options
      // and exclusive in the slice method
      return Readable.from("Another file".slice(start, end)) as ReadStream;
    });

    const generator = iterateFilesFromPathsWithSize(["test1", "test2"], {
      nBytes: 11,
    });

    const files1 = await generator.next();
    expect(files1.done).toBeFalsy();
    expect(files1.value).toBeDefined();

    if (files1.value) {
      expect(files1.value).toHaveLength(2);
      expect(files1.value[0]).toEqual(
        expect.objectContaining({
          name: "test1/file1.txt",
          size: 10,
          stream: expect.any(Function),
        })
      );
      if (files1.value[0]) {
        expect(await text(files1.value[0].stream())).toBe("Hello World");
      }
      expect(files1.value[1]).toEqual(
        expect.objectContaining({
          name: "test2/file2.txt.part.0",
          originalInfo: {
            name: "test2/file2.txt",
            size: 12,
            hash: expect.any(String),
          },
          size: 1,
          stream: expect.any(Function),
        })
      );
      if (files1.value[1]) {
        expect(await text(files1.value[1].stream())).toBe("A");
      }
    }

    const files2 = await generator.next();
    expect(files2.done).toBeFalsy();
    expect(files2.value).toBeDefined();

    if (files2.value) {
      expect(files2.value).toHaveLength(1);
      expect(files2.value[0]).toEqual(
        expect.objectContaining({
          name: "test2/file2.txt.part.1",
          originalInfo: {
            name: "test2/file2.txt",
            size: 12,
            hash: expect.any(String),
          },
          size: 11,
          stream: expect.any(Function),
        })
      );
      if (files2.value[0]) {
        expect(await text(files2.value[0].stream())).toBe("nother file");
      }
    }

    const files3 = await generator.next();
    expect(files3.done).toBeTruthy();
    expect(files3.value).toBeUndefined();
  });
});
