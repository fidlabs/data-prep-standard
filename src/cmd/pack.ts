/* eslint-disable n/no-unsupported-features/node-builtins */
import crypto from "node:crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFile,
} from "node:fs";
import { open } from "node:fs/promises";
import { join } from "node:path";
import { Writable } from "node:stream";

import { CarWriter } from "@ipld/car/writer";
import { Block } from "@ipld/unixfs";
import { CAREncoderStream } from "ipfs-car";
import { CID } from "multiformats/cid";

import { mergeDeep } from "../contents.js";
import { iterateFilesFromPathsWithSize } from "../files.js";
import type {
  SubManifest,
  SuperManifest,
  SuperManifestContentEntry,
  UserMetadata,
} from "../manifest.d.js";
import { createDirectoryEncoderStream } from "../unixfs.js";

// Root CID written in CAR file header before it is updated with the real root CID.
const placeholderCID = CID.parse(
  "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
);

const currentSpecURL =
  "https://raw.githubusercontent.com/fidlabs/data-prep-standard/refs/heads/main/specification/v0/FilecoinDataPreparationManifestSpecification.md";

export default async function pack(
  filePaths: string[],
  opts: {
    hidden?: boolean;
    lite?: boolean;
    output: string;
    metadata: string;
    specVersion: string;
    targetCarSize?: string;
  }
) {
  console.log("pack", filePaths, opts);

  if (opts.specVersion !== "0.1.0") {
    throw new Error(
      `Unsupported schema version: ${opts.specVersion}. Only 0.1.0 is supported.`
    );
  }

  // Check if output directory exists, if not create it
  if (!existsSync(opts.output)) {
    mkdirSync(opts.output, { recursive: true });
  }

  const metadata = JSON.parse(
    readFileSync(opts.metadata, "utf-8")
  ) as UserMetadata;

  const uuid = crypto.randomUUID();

  // Create one or more streams of files to pack
  const subManifests: { rootCID: CID; subManifest: SubManifest }[] = [];
  let nPiece = 0;

  for await (const files of iterateFilesFromPathsWithSize(filePaths)) {
    let rootCID = placeholderCID;

    console.log(
      `Piece ${String(nPiece)}: files to pack: `,
      files.map((f) => f.name)
    );

    const { stream, close } = createDirectoryEncoderStream(files, {
      metadata,
      uuid,
      specVersion: opts.specVersion,
      lite: opts.lite ?? false,
      spec: currentSpecURL,
    });

    await stream
      .pipeThrough(
        new TransformStream<Block, Block>({
          transform(block, controller) {
            // we visit every block, the last one will be the root block
            rootCID = CID.parse(block.cid.toString());
            // console.log("Root CID:", rootCID.toString());
            controller.enqueue(block);
          },
        })
      )
      .pipeThrough(new CAREncoderStream([placeholderCID]))
      .pipeTo(
        Writable.toWeb(
          createWriteStream(
            join(
              opts.output,
              `piece-${nPiece.toString().padStart(4, "0")}.car`
            ),
            { autoClose: true }
          )
        )
      );

    // console.log("Packing completed, root CID:", rootCID.toString());

    const subManifest = await close;

    // update roots in CAR header
    const fd = await open(
      join(opts.output, `piece-${nPiece.toString().padStart(4, "0")}.car`),
      "r+"
    );
    await CarWriter.updateRootsInFile(fd, [rootCID]);
    await fd.close();

    subManifests.push({ rootCID, subManifest });
    nPiece++;
  }

  const superManifest: SuperManifest = {
    "@spec": currentSpecURL,
    "@spec_version": opts.specVersion,
    ...metadata,
    uuid,
    n_pieces: subManifests.length,
    pieces: subManifests.map(({ rootCID }) => {
      return {
        piece_cid: "TODO: calculate commP",
        payload_cid: rootCID.toString(),
      };
    }),
  };

  if (!opts.lite) {
    const contents: SuperManifestContentEntry[] = [];
    // TODO: should be pieceCID
    subManifests.forEach(({ rootCID, subManifest }) => {
      mergeDeep(contents, rootCID, ...(subManifest.contents ?? []));
    });
    superManifest.contents = contents;
  }

  writeFile(
    join(opts.output, "manifest.json"),
    JSON.stringify(superManifest, null, 2),
    (error) => {
      if (error) throw error;
    }
  );
}
