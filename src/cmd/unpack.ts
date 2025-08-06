/* eslint-disable n/no-unsupported-features/node-builtins */
import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  readdirSync,
  readFileSync,
} from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { join, sep } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { createCommPStream } from "@filoz/synapse-sdk/commp";
import { CarIndexedReader, RawLocation } from "@ipld/car/indexed-reader";
import { CarIndexer } from "@ipld/car/indexer";
import { createParseStream } from "big-json";
import { recursive as exporter } from "ipfs-unixfs-exporter";
import { CID } from "multiformats/cid";

import { SubManifest, SuperManifest } from "../manifest.js";
import {
  PieceVerifier,
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

    const iterable = await CarIndexer.fromIterable(Readable.fromWeb(stream));
    const index = new Map<string, RawLocation>();
    const order = [];
    for await (const { cid, blockLength, blockOffset } of iterable) {
      const cidStr = cid.toString();
      index.set(cidStr, { blockLength, blockOffset });
      order.push(cidStr);
    }
    const roots = await iterable.getRoots();
    const reader = new CarIndexedReader(
      iterable.version,
      file,
      roots,
      index,
      order
    );

    const [rootCID] = roots;
    if (!rootCID) {
      throw new Error(`No root CID found in CAR: ${file}`);
    }
    console.log("rootCID", rootCID);

    const entries = exporter(rootCID, {
      async get(cid) {
        const block = await reader.get(cid);
        if (!block) {
          throw new Error(`Missing block: ${cid.toString()}`);
        }

        return block.bytes;
      },
    });
    await reader.close();

    const pieceVerifier = new PieceVerifier(file);
    let subManifest: SubManifest | undefined;

    for await (const entry of entries) {
      const filePath = join(...entry.path.split(sep).slice(1));
      const outPath = join(opts.output, filePath);

      if (entry.type === "file" || entry.type === "raw") {
        if (filePath === "manifest.json") {
          console.log("Sub manifest found, loading");
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
    console.log("sub manifest", JSON.stringify(subManifest, null, 2));
    const pieceCid = getCommP();
    if (!pieceCid) {
      throw new Error("Failed to get CommP from stream");
    }
    fileParts.push(...pieceVerifier.verify(subManifest, rootCID));
    verifier.addPiece(pieceVerifier, CID.parse(pieceCid.toString()));
  }

  // After unpacking all the CARs we then attempt to join all the split files (as they
  // could have been split between any of the supplied CARs)

  const splitFiles = fileParts.reduce<Map<string, VerificationSplitFile>>(
    (
      map: Map<string, VerificationSplitFile>,
      filePart: VerificationFilePart
    ) => {
      if (!map.has(filePart.originalFileName)) {
        map.set(filePart.originalFileName, {
          name: filePart.originalFileName,
          hash: filePart.originalFileHash,
          byteLength: filePart.originalFileByteLength,
          parts: [],
        });
      }
      map.get(filePart.originalFileName)?.parts.push(filePart);
      return map;
    },
    new Map<string, VerificationSplitFile>()
  );

  verifier.verifyPieces(splitFiles);

  const promises: Promise<void>[] = [];
  for (const splitFile of splitFiles.values()) {
    console.log("joining", splitFile);
    const stream = async (splitFile: VerificationSplitFile): Promise<void> => {
      const writeStream = createWriteStream(join(opts.output, splitFile.name));
      for (const filePart of splitFile.parts.sort((a, b) =>
        a.name.localeCompare(b.name)
      )) {
        console.log("cat", filePart.name, readdirSync(opts.output));
        await pipeline(
          createReadStream(join(opts.output, filePart.name)),
          writeStream,
          { end: false }
        );
        console.log("unlink", join(opts.output, filePart.name));
        await unlink(join(opts.output, filePart.name));
      }
      writeStream.close();
    };
    promises.push(stream(splitFile));
  }
  await Promise.all(promises);
}
