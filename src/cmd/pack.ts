/* eslint-disable n/no-unsupported-features/node-builtins */
import crypto from "node:crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFile,
} from "node:fs";
import { open } from "node:fs/promises";
import { join } from "node:path";
import { Writable } from "node:stream";

import { CarWriter } from "@ipld/car/writer";
import { Block } from "@ipld/unixfs";
import { CAREncoderStream } from "ipfs-car";
import { CID } from "multiformats/cid";

import { iterateFilesFromPathsWithSize } from "../files.js";
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
  console.log("pack", filePaths, opts, targetCarSize);

  // Check if output directory exists, if not create it
  if (!existsSync(opts.output)) {
    mkdirSync(opts.output, { recursive: true });
  }

  const manifest = new Manifest(
    JSON.parse(readFileSync(opts.metadata, "utf-8")) as UserMetadata,
    opts.specVersion,
    { lite: opts.lite ?? undefined }
  );

  for await (const files of iterateFilesFromPathsWithSize(
    filePaths,
    targetCarSize
  )) {
    let rootCID = placeholderCID;
    let pieceCID = placeholderCID;

    const subManifest = manifest.newSubManifest();
    // We use a UUID for a temporary piece file name, we will renamr it later
    // after the root (payload) CID is known.
    const pieceTemporaryFilename = `piece-${crypto.randomUUID()}.car`;

    console.log(
      `New piece: files to pack: `,
      files.map((f) => f.name)
    );

    const { stream, subManifestPromise } = createDirectoryEncoderStream(
      files,
      subManifest
    );

    await stream
      .pipeThrough(
        new TransformStream<Block, Block>({
          transform(block, controller) {
            // we visit every block, the last one will be the root block
            rootCID = CID.parse(block.cid.toString());

            // TODO: work out the proper piece CID (CommP)
            pieceCID = rootCID;
            // console.log("Root CID:", rootCID.toString());
            controller.enqueue(block);
          },
        })
      )
      .pipeThrough(new CAREncoderStream([placeholderCID]))
      .pipeTo(
        Writable.toWeb(
          createWriteStream(join(opts.output, pieceTemporaryFilename), {
            autoClose: true,
          })
        )
      );

    // console.log("Packing completed, root CID:", rootCID.toString());

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

  writeFile(
    join(opts.output, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    (error) => {
      if (error) throw error;
    }
  );
}
