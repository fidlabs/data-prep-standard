/* eslint-disable n/no-unsupported-features/node-builtins */
import { createHash } from "node:crypto";
import { createReadStream, WriteStream } from "node:fs";
import { join, sep } from "node:path";
import { Readable, Transform, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { createCommPStream } from "@filoz/synapse-sdk/commp";
import { CarIndexedReader, RawLocation } from "@ipld/car/indexed-reader";
import { CarIndexer } from "@ipld/car/indexer";
import { validateBlock } from "@web3-storage/car-block-validator";
import { createParseStream } from "big-json";
import { recursive as exporter } from "ipfs-unixfs-exporter";
import { CID } from "multiformats/cid";

import { SubManifest } from "./manifest.js";
import { VerificationFilePart, Verifier } from "./verifier.js";

export default async function verify(
  files: string[],
  verifier: Verifier,
  outStreamFactory?: (path: string) => WriteStream,
  mkdir?: (path: string) => Promise<void>
): Promise<VerificationFilePart[]> {
  const fileParts: VerificationFilePart[] = [];

  for (const file of files) {
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
        await validateBlock(block);

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
        const hasher = createHash("sha256");
        const writeStream =
          outStreamFactory ?
            outStreamFactory(filePath)
          : new Writable({
              write: (_chunk, _encoding, callback) => {
                callback();
              },
            });
        await pipeline(
          entry.content(),
          new Transform({
            transform(
              chunk: Uint8Array,
              _encoding: BufferEncoding,
              callback: (error?: Error | null, data?: unknown) => void
            ): void {
              // If we use the hasher stream then it will round up the byte length
              // to the nearest block size for the hashing algorithm, so we need to
              // use the original byte length from the incoming chunk.
              hasher.update(chunk);
              this.push(chunk);
              callback();
            },
          }),
          writeStream
        );

        pieceVerifier.addFile(filePath, {
          hash: hasher.digest("hex"),
          byteLength: Number(entry.size),
          cid: entry.cid.toString(),
        });
      } else if (entry.type === "directory") {
        if (mkdir) {
          await mkdir(filePath);
        }
        pieceVerifier.addDirectory(filePath);
      } else {
        throw new Error(
          `Unsupported UnixFS type ${entry.type} for path: ${filePath}`
        );
      }
    }
    await reader.close();
    if (!subManifest) {
      throw new Error(`Sub manifest not found in CAR '${file}'`);
    }
    fileParts.push(...pieceVerifier.verify(subManifest));
  }

  return fileParts;
}
