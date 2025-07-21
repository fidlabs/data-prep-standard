import assert from "node:assert";
import { existsSync } from "node:fs";
import { mkdir, open } from "node:fs/promises";
import { join, sep } from "node:path";

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
    nFiles?: number;
    maxDepth?: number;
    maxName?: number;
    minSize?: number;
    maxSize?: number;
  } = {}
) => {
  let subdir = "";

  const defaults = {
    nFiles: 1 * 1000 * 1000,
    maxDepth: 30,
    maxName: 80,
    minSize: 1,
    maxSize: 16 * 1024,
  };

  const options: {
    nFiles: number;
    maxDepth: number;
    maxName: number;
    minSize: number;
    maxSize: number;
  } = { ...defaults, ...opts };

  await mkdir(path, { recursive: true });

  const promises: Promise<void>[] = [];

  for (let i = 0; i < options.nFiles; i++) {
    if (i && i % options.maxDepth === 0) {
      if (subdir.split(sep).length === options.maxDepth) {
        const n = Math.floor(Math.random() * options.maxDepth);
        subdir = join(...subdir.split(sep).slice(0, n));
      } else {
        subdir = join(
          subdir,
          makeName(Math.floor((Math.random() * options.maxName) / 10) + 4)
        );
        await mkdir(join(path, subdir));
      }
    }
    promises.push(
      open(join(path, subdir, makeName(options.maxName)), "w+", 0o644).then(
        async (fh) => {
          const sizeVariance = Math.floor(options.maxSize - options.minSize);
          expect(sizeVariance).toBeGreaterThan(-1);
          // We use truncate to create sparse files on unix-like file systems.
          // This saves a bunch of real disk space for the input files.
          await fh.truncate(
            Math.floor(options.minSize) +
              Math.floor(Math.random() * sizeVariance)
          );
          await fh.sync();
          await fh.close();
        }
      )
    );
  }
  await Promise.all(promises);
};

describe("CLI", function () {
  beforeAll(async () => {
    const filesPath = join("testing", "generated", "pack.e2e.ManyFiles");
    if (!existsSync(filesPath)) {
      await mkFileTree(filesPath);
    }
  }, 600 * 1000);

  beforeAll(async () => {
    const filesPath = join("testing", "generated", "pack.e2e.HugeFile");
    if (!existsSync(filesPath)) {
      await mkFileTree(filesPath, {
        nFiles: 1,
        minSize: 36 * 1024 * 1024 * 1024,
        maxSize: 36 * 1024 * 1024 * 1024,
      });
    }
  }, 600 * 1000);

  it(
    "pack many files",
    () => {
      assert.doesNotThrow(() =>
        execaSync(binPath, [
          "pack",
          "-m",
          "testing/inputs/metadata/basic.json",
          "-l",
          "-o",
          "testing/outputs/pack.e2e.ManyFiles",
          "testing/generated/pack.e2e.ManyFiles",
        ])
      );
    },
    600 * 1000
  );

  it(
    "pack one huge files",
    () => {
      assert.doesNotThrow(() =>
        execaSync(binPath, [
          "pack",
          "-m",
          "testing/inputs/metadata/basic.json",
          "-o",
          "testing/outputs/pack.e2e.HugeFile",
          "testing/generated/pack.e2e.HugeFile",
        ])
      );
    },
    600 * 1000
  );
});
