/* eslint-disable n/no-unsupported-features/node-builtins */
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { open } from "node:fs/promises";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";

import { createCommPStream } from "@filoz/synapse-sdk/commp";
import { CarWriter } from "@ipld/car/writer";
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
): Promise<void> {
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

  for await (const files of iterateFilesFromPathsWithSize(filePaths, {
    nBytes: targetCarSize,
    lite: opts.lite,
  })) {
    const subManifest = manifest.newSubManifest();
    const pieceTemporaryFilename = `piece.car.streaming`;

    console.log(`New piece. Files to pack:`, files.length);

    const { stream, subManifestPromise } = createDirectoryEncoderStream(
      files,
      subManifest
    );

    const carEncoder = new CAREncoderStream([placeholderCID]);

    try {
      await stream.pipeThrough(carEncoder).pipeTo(
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
        throw new Error("Failed to get final block from CAR stream");
      }
      const rootCID = CID.parse(carEncoder.finalBlock.cid.toString());

      // update root in CAR header
      const fd = await open(join(opts.output, pieceTemporaryFilename), "r+");
      await CarWriter.updateRootsInFile(fd, [rootCID]);
      await fd.close();

      // We need to stream the whole file again to get the piece CID for the
      // CAR with updated root header :(
      const { stream: commPTransform, getCommP } = createCommPStream();
      await Readable.toWeb(
        createReadStream(join(opts.output, pieceTemporaryFilename))
      )
        .pipeThrough(commPTransform)
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .pipeTo(new WritableStream({ write: () => {} }));

      // Bit tortured to get the CID as FilOz use a 'legacy' type in preparation for Piece V2.
      const commP = getCommP();
      if (!commP) {
        throw new Error("Failed to get CommP from stream");
      }
      const pieceCID = CID.parse(commP.toString());

      console.log(
        `Packing completed, root CID: ${rootCID.toString()}, piece CID: ${pieceCID.toString()}`
      );

      await subManifestPromise;
      manifest.addPiece(subManifest, pieceCID, rootCID);

      renameSync(
        join(opts.output, pieceTemporaryFilename),
        join(opts.output, `piece-${rootCID.toString()}.car`)
      );
    } catch (err: unknown) {
      if (existsSync(pieceTemporaryFilename)) {
        unlinkSync(pieceTemporaryFilename);
      }
      throw err;
    }
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
