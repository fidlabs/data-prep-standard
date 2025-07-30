/* eslint-disable n/no-unsupported-features/node-builtins */
import crypto from "node:crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
} from "node:fs";
import { open } from "node:fs/promises";
import { join } from "node:path";
import { Writable } from "node:stream";

import { createCommPStream } from "@filoz/synapse-sdk/commp";
import { CarWriter } from "@ipld/car/writer";
import { Block } from "@ipld/unixfs";
import { CAREncoderStream } from "ipfs-car";
import { CID } from "multiformats/cid";

import { iterateFilesFromPathsWithSize } from "../files.js";
import { JSONReadableStreamFromObject } from "../jsonReadableStreamFromObject.js";
import { Manifest, type UserMetadata } from "../manifest.js";
import parseBytes from "../parseBytes.js";
import { createDirectoryEncoderStream } from "../unixfs.js";

// Root CID written in CAR file header before it is updated with the real root CID.
const placeholderCID = CID.parse(
  "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
);

export default async function pack(
  filePaths: string[],
  opts: {
    hidden?: boolean;
    lite?: boolean;
    output: string;
    metadata: string;
    specVersion: string;
    targetCarSize: string;
  }
) {
  const targetCarSize = parseBytes(opts.targetCarSize);
  console.log("packing paths:", filePaths);

  // Check if output directory exists, if not create it
  if (!existsSync(opts.output)) {
    mkdirSync(opts.output, { recursive: true });
  }

  const manifest = new Manifest(
    JSON.parse(readFileSync(opts.metadata, "utf-8")) as UserMetadata,
    opts.specVersion,
    { lite: opts.lite ?? undefined }
  );

  console.log("Scanning files for packing");

  for await (const files of iterateFilesFromPathsWithSize(
    filePaths,
    targetCarSize
  )) {
    const subManifest = manifest.newSubManifest();
    // We use a UUID for a temporary piece file name, we will renamr it later
    // after the root (payload) CID is known.
    const pieceTemporaryFilename = `piece-${crypto.randomUUID()}.car`;

    console.log(`New piece. Files to pack:`, files.length);

    const { stream, subManifestPromise } = createDirectoryEncoderStream(
      files,
      subManifest
    );

    const { stream: commPTransform, getCommP } = createCommPStream();
    const carEncoder = new CAREncoderStream([placeholderCID])

    await stream
      .pipeThrough(carEncoder)
      .pipeThrough(commPTransform)
      .pipeTo(
        Writable.toWeb(
          createWriteStream(join(opts.output, pieceTemporaryFilename), {
            autoClose: true,
            // Without this the entire sub-manifest gets cached in memory before being
            // written to disk
            highWaterMark: 1,
          })
        ) as WritableStream<Buffer>
      );

    if (!carEncoder.finalBlock) {
      throw new Error("Failed to get final block from CAR stream")
    }
    const rootCID = CID.parse(carEncoder.finalBlock.cid.toString())

    // Bit tortured to get the CID as FilOz use a 'legacy' type in preparation for Piece V2.
    const streamCommP = getCommP();
    if (!streamCommP) {
      throw new Error("Failed to get CommP from stream");
    }
    const pieceCID = CID.parse(streamCommP.toString());

    console.log(
      `Packing completed, root CID: ${rootCID.toString()}, piece CID: ${pieceCID.toString()}`
    );

    await subManifestPromise;

    // update roots in CAR header
    const fd = await open(join(opts.output, pieceTemporaryFilename), "r+");
    await CarWriter.updateRootsInFile(fd, [rootCID]);
    await fd.close();

    renameSync(
      join(opts.output, pieceTemporaryFilename),
      join(opts.output, `piece-${rootCID.toString()}.car`)
    );

    manifest.addPiece(subManifest, pieceCID, rootCID);
  }

  console.log("Packing completed, writing manifest");
  await JSONReadableStreamFromObject(manifest).pipeTo(
    Writable.toWeb(
      createWriteStream(join(opts.output, "manifest.json"), {
        autoClose: true,
        // Without this the entire manifest gets cached in memory before being
        // written to disk
        highWaterMark: 1,
      })
    ) as WritableStream<Buffer>
  );
}
