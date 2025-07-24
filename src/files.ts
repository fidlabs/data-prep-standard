/* eslint-disable n/no-unsupported-features/node-builtins */
import assert from "node:assert";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { FileLike, filesFromPaths } from "files-from-path";

interface originalInfo {
  name: string;
  hash: string;
  size: number;
}

export interface SplitFileLike extends FileLike {
  media_type?: string;
  originalInfo?: originalInfo;
}

// We split files between CARs if the files are larger than this % of the desired
// car size.
// Efficient downloading of the whole original is important, and splitting large
// files into lots of parts and spreading it across lots of pieces will become problematic,
// so we set this quite high.
const splitFileIfOverPercentage = 50;

/* iterateFilesFromPathsWithSize
 * This function takes an array of file paths and yields batches of files
 * where each batch does not exceed a specified size limit (default is 31 GiB).
 * Each yielded batch is an array of SplitFileLike objects.
 *
 * @param {string[]} filePaths - Array of file paths to process.
 * @param {number} nBytes - Maximum size in bytes for each batch (default: 31 GiB).
 * @returns {AsyncGenerator<SplitFileLike[]>} - An async generator yielding batches of files.
 */

export const iterateFilesFromPathsWithSize = async function* (
  filePaths: string[],
  nBytes = 31 * 1024 * 1024 * 1024
): AsyncGenerator<SplitFileLike[], void, void> {
  const allFiles = await filesFromPaths(filePaths, {
    fs: { createReadStream, promises: { readdir, stat } },
  });
  let bytes = 0;
  const files: SplitFileLike[] = [];

  const nextBatch = () => {
    files.length = 0;
    bytes = 0;
  };

  for (const file of allFiles) {
    if (
      bytes == nBytes ||
      (file.size > (nBytes * splitFileIfOverPercentage) / 100 &&
        file.size % nBytes > nBytes - bytes)
    ) {
      // Not much room in current batch, start a new one
      yield files;
      nextBatch();
    }

    if (bytes + file.size <= nBytes) {
      // File fits in a batch

      const splitFile: SplitFileLike = {
        ...file,
        // TODO: media_type: need to get the full path to the file in a sensible way
        // media_type: mime.getType(file.name)
      };
      files.push(splitFile);
      bytes += file.size;

      continue;
    }

    // File is big and needs splitting over multiple batches

    let fileSizeRemaining = file.size;
    let offset = 0;
    let part = 0;
    const lenNumParts = Math.floor((file.size + bytes - 1) / nBytes).toString()
      .length;

    let hash = "";
    const hasher = createHash("sha256").setEncoding("hex");
    hasher.on("readable", () => {
      // Only one element is going to be produced by the
      // hash stream.
      const data = hasher.read() as undefined | Buffer;
      if (data?.length) {
        hash = data.toString("hex");
      }
    });
    await pipeline(file.stream(), hasher);

    while (fileSizeRemaining > 0) {
      const size = Math.min(nBytes - bytes, fileSizeRemaining);
      // console.log(
      //   `Splitting file ${file.name} into part ${part} of size ${size}`
      // );

      const splitFile: SplitFileLike = {
        name: `${file.name}.part.${part.toString().padStart(lenNumParts, "0")}`,
        size: size,
        stream: (function (path, start, end) {
          return () => Readable.toWeb(createReadStream(path, { start, end }));
        })(join(filePaths[0] ?? "", file.name), offset, offset + size - 1),
        originalInfo: {
          name: file.name,
          hash,
          size: file.size,
        },
      };

      files.push(splitFile);
      bytes += size;
      offset += size;
      fileSizeRemaining -= size;
      part++;

      assert(bytes <= nBytes);

      if (bytes === nBytes && fileSizeRemaining > 0) {
        // We filled another batch and there is more to come
        yield files;
        nextBatch();
      }
    }
  }
  yield files; // Yield the last batch of files
};
