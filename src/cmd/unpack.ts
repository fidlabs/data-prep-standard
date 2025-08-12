import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  readFileSync,
  WriteStream,
} from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { SuperManifest } from "../manifest.js";
import {
  VerificationFilePart,
  VerificationSplitFile,
  Verifier,
} from "../verifier.js";
import verify from "../verify.js";

export default async function unpack(
  files: string[],
  opts: {
    output: string;
    superManifest?: string;
    verbose: boolean;
  }
): Promise<void> {
  console.log("unpack", files, opts);

  let superManifest: SuperManifest | undefined;

  if (opts.superManifest) {
    // We have been provided with a super manifest, so load it and use it to
    // check all the CARs
    superManifest = JSON.parse(
      readFileSync(opts.superManifest, "utf-8")
    ) as SuperManifest;

    if (files.length != superManifest.n_pieces) {
      throw new Error(
        `Super manifest specifies ${String(superManifest.n_pieces)} pieces and you have only provided ${String(files.length)} CAR files.`
      );
    }
  }
  const verifier = new Verifier(superManifest);

  const newFileStream = (path: string): WriteStream => {
    const outPath = join(opts.output, path);
    if (opts.verbose) {
      console.log(outPath);
    }
    return createWriteStream(outPath);
  };

  const createDir = async (path: string): Promise<void> => {
    await mkdir(join(opts.output, path), { recursive: true });
  };

  const fileParts = await verify(files, verifier, newFileStream, createDir);

  // After unpacking all the CARs we then attempt to join all the split files (as they
  // could have been split between any of the supplied CARs)

  // We only support split files with full manifests (no --lite) so we have a full
  // description of all the parts.

  const splitFiles = fileParts.reduce<Map<string, VerificationFilePart[]>>(
    (
      map: Map<string, VerificationFilePart[]>,
      filePart: VerificationFilePart
    ) => {
      if (!map.has(filePart.originalFileName)) {
        map.set(filePart.originalFileName, []);
      }
      map.get(filePart.originalFileName)?.push(filePart);
      return map;
    },
    new Map<string, VerificationFilePart[]>()
  );

  const joinedFiles = new Map<string, VerificationSplitFile>();

  const promises: Promise<void>[] = [];
  for (const [path, parts] of splitFiles.entries()) {
    console.log(
      "joining",
      path,
      "from",
      parts.map((p) => p.name)
    );
    let originalHash: string | undefined;
    let originalByteLength: number | undefined;
    const stream = async (
      path: string,
      parts: VerificationFilePart[]
    ): Promise<void> => {
      const hasher = createHash("sha256");
      const writeStream = createWriteStream(join(opts.output, path));
      for (const filePart of parts.sort((a, b) =>
        a.name.localeCompare(b.name)
      )) {
        originalHash ??= filePart.originalFileHash;
        if (originalHash !== filePart.originalFileHash) {
          throw new Error(
            `File part '${filePart.name}' has a different original hash from another part: ${originalHash} vs ${filePart.originalFileHash}`
          );
        }
        originalByteLength ??= filePart.originalFileByteLength;
        if (originalByteLength !== filePart.originalFileByteLength) {
          throw new Error(
            `File part '${filePart.name}' has a different original byte length from another part: ${String(originalByteLength)} vs ${String(filePart.originalFileByteLength)}`
          );
        }

        console.log("adding", filePart.name, filePart.byteLength, "to", path);
        const readStream = createReadStream(join(opts.output, filePart.name));

        await pipeline(
          readStream,
          new Transform({
            transform(chunk: Uint8Array, _encoding, callback) {
              hasher.update(chunk);
              this.push(chunk);
              callback();
            },
          }),
          writeStream,
          { end: false }
        );
        await unlink(join(opts.output, filePart.name));
      }
      const hash = hasher.digest("hex");
      writeStream.close();
      joinedFiles.set(path, {
        hash,
        byteLength: writeStream.bytesWritten,
      });
      if (writeStream.bytesWritten !== originalByteLength) {
        throw new Error(
          `Joined file '${path}' has byte length '${String(writeStream.bytesWritten)}' but expected '${String(originalByteLength)}'.  Have you provided all the CARs for this dataset?`
        );
      }
      if (hash !== originalHash) {
        throw new Error(
          `Joined file '${path}' has hash '${hash}' but expected '${originalHash ?? "unknown"}'.`
        );
      }
    };
    promises.push(stream(path, parts));
  }
  await Promise.all(promises);

  // Final verification of the unpacked directory tree including the joined files
  verifier.verifyPieces(joinedFiles);
}
