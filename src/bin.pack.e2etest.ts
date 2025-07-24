import { existsSync } from "node:fs";
import { mkdir, open } from "node:fs/promises";
import { join, sep } from "node:path";

import { describe, expect, test } from "@jest/globals";
import { execaSync } from "execa";

const binPath = "./dist/bin.js";

function makeName(length: number): string {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/* mkFileTree
 * make a file system tree with lots of files and dirs for testing
 */
const mkFileTree = async (
  path: string,
  opts: {
    nFiles: number;
    maxDepth: number;
    maxName: number;
    minSize: number;
    maxSize: number;
  }
) => {
  let subdir = "";

  await mkdir(path, { recursive: true });

  const promises: Promise<void>[] = [];

  for (let i = 0; i < opts.nFiles; i++) {
    if (i && i % opts.maxDepth === 0) {
      if (subdir.split(sep).length === opts.maxDepth) {
        const n = Math.floor(Math.random() * opts.maxDepth);
        subdir = join(...subdir.split(sep).slice(0, n));
      } else {
        subdir = join(
          subdir,
          makeName(Math.floor((Math.random() * opts.maxName) / 10) + 4)
        );
        await mkdir(join(path, subdir));
      }
    }
    promises.push(
      open(join(path, subdir, makeName(opts.maxName)), "w+", 0o644).then(
        async (fh) => {
          const sizeVariance = Math.floor(opts.maxSize - opts.minSize);
          expect(sizeVariance).toBeGreaterThan(-1);
          // We use truncate to create sparse files on unix-like file systems.
          // This saves a bunch of real disk space for the input files.
          await fh.truncate(
            Math.floor(opts.minSize) + Math.floor(Math.random() * sizeVariance)
          );
          await fh.sync();
          await fh.close();
        }
      )
    );
  }
  await Promise.all(promises);
};

describe("pack", function () {
  beforeAll(async () => {
    const filesPath = join("testing", "generated", "pack.e2e.ManyFiles");
    if (!existsSync(filesPath)) {
      await mkFileTree(filesPath, {
        // we would like to test with a million files, but there is
        // not enough disk space on the CI to do that, so we use 1000 instead
        nFiles: 1 * 1000, // * 1000,
        minSize: 1,
        maxSize: 1 * 1024,
        maxDepth: 30,
        maxName: 80,
      });
    }
  });

  beforeAll(async () => {
    const filesPath = join("testing", "generated", "pack.e2e.HugeFile");
    if (!existsSync(filesPath)) {
      await mkFileTree(filesPath, {
        nFiles: 1,
        // we would like to test a file that is larger than 32GB, but there is
        // not enough disk space on the CI to do that, so we use 36MB instead
        minSize: 36 * 1024 * 1024, // * 1024,
        maxSize: 36 * 1024 * 1024, // * 1024,
        maxDepth: 1,
        maxName: 20,
      });
    }
  });

  test("pack many files", () => {
    expect(() => {
      execaSync(binPath, [
        "pack",
        "-m",
        "testing/inputs/metadata/basic.json",
        "-l",
        "-o",
        "testing/outputs/pack.e2e.ManyFiles",
        "testing/generated/pack.e2e.ManyFiles",
      ]);
    }).not.toThrow();
  });

  test("pack one huge file", () => {
    expect(() => {
      const { stdout } = execaSync(binPath, [
        "pack",
        "-m",
        "testing/inputs/metadata/basic.json",
        "--target-car-size",
        "31MiB",
        "-o",
        "testing/outputs/pack.e2e.HugeFile",
        "testing/generated/pack.e2e.HugeFile",
      ]);
      console.log("stdout:", stdout);
    }).not.toThrow();
  });
});
