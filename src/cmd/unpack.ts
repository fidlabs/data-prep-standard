/* eslint-disable n/no-unsupported-features/node-builtins */
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, readFileSync } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { join, sep } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { createCommPStream } from "@filoz/synapse-sdk/commp";
import { CarIndexedReader, RawLocation } from "@ipld/car/indexed-reader";
import { CarIndexer } from "@ipld/car/indexer";
import { validateBlock } from "@web3-storage/car-block-validator"
import { createParseStream } from "big-json";
import { recursive as exporter } from "ipfs-unixfs-exporter";
import { CID } from "multiformats/cid";

import { SubManifest, SuperManifest } from "../manifest.js";
import {
  VerificationFilePart,
  VerificationSplitFile,
  Verifier,
} from "../verify.js";

export default async function unpack(
  files: string[],
  opts: {
    output: string;
    superManifest?: string;
    verbose: boolean;
  }
): Promise<void> {
  let superManifest: SuperManifest | undefined;

  console.log("unpack", files, opts);

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
  const fileParts: VerificationFilePart[] = [];

  for (const file of files) {
    console.log("unpack", file);

    const { stream: commPTransform, getCommP } = createCommPStream();

    const stream = Readable.toWeb(createReadStream(file)).pipeThrough(
      commPTransform
    );

    const indexer = await CarIndexer.fromIterable(Readable.fromWeb(stream));
    const index = new Map<string, RawLocation>();
    const order = [];
    for await (const { cid, blockLength, blockOffset } of indexer) {
      const cidStr = cid.toString();
      index.set(cidStr, { blockLength, blockOffset });
      order.push(cidStr);
    }
    const roots = await indexer.getRoots();
    const reader = new CarIndexedReader(
      indexer.version,
      file,
      roots,
      index,
      order
    );

    const [rootCID] = roots;
    if (!rootCID) {
      throw new Error(`No root CID found in CAR: ${file}`);
    }

    const entries = exporter(rootCID, {
      async get(cid) {
        const block = await reader.get(cid);
        if (!block) {
          throw new Error(`Missing block: ${cid.toString()}`);
        }
        await validateBlock(block)

        return block.bytes;
      },
    });

    const pieceCid = getCommP();
    if (!pieceCid) {
      throw new Error("Failed to get CommP from stream");
    }

    const pieceVerifier = verifier.newPieceVerifier(
      file,
      rootCID,
      CID.parse(pieceCid.toString())
    );
    let subManifest: SubManifest | undefined;

    for await (const entry of entries) {
      const filePath = join(...entry.path.split(sep).slice(1));
      const outPath = join(opts.output, filePath);

      if (entry.type === "file" || entry.type === "raw") {
        if (filePath === "manifest.json") {
          console.log("Sub manifest found");
          await pipeline(
            entry.content(),
            createParseStream().on("data", (data) => {
              subManifest = data as SubManifest;
            })
          );
          // We don't save the sub manifest to disk so the data is the same as
          // when it was packed
          continue;
        }
        if (opts.verbose) {
          console.log(filePath);
        }
        const hasher = createHash("sha256");

        await pipeline(entry.content(), hasher, createWriteStream(outPath));
        pieceVerifier.addFile(filePath, {
          hash: hasher.digest("hex"),
          byteLength: Number(entry.size),
          cid: entry.cid.toString(),
        });
      } else if (entry.type === "directory") {
        await mkdir(outPath, { recursive: true });
        pieceVerifier.addDirectory(filePath);
      } else {
        throw new Error(
          `Unsupported UnixFS type ${entry.type} for path: ${filePath}`
        );
      }
    }
    if (!subManifest) {
      throw new Error(`Sub manifest not found in CAR '${file}'`);
    }
    fileParts.push(...pieceVerifier.verify(subManifest));
  }

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
    const stream = async (
      path: string,
      parts: VerificationFilePart[]
    ): Promise<void> => {
      const hasher = createHash("sha256");
      const writeStream = createWriteStream(join(opts.output, path));
      for (const filePart of parts.sort((a, b) =>
        a.name.localeCompare(b.name)
      )) {
        await pipeline(
          createReadStream(join(opts.output, filePart.name)),
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
      writeStream.close();
      joinedFiles.set(path, {
        hash: hasher.digest("hex"),
        byteLength: writeStream.bytesWritten,
      });
    };
    promises.push(stream(path, parts));
  }
  await Promise.all(promises);

  // Final verification of the unpacked directory tree including the joined files
  verifier.verifyPieces(joinedFiles);
}
