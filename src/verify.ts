import { join } from "node:path";

import { CID } from "multiformats";

import {
  SubManifest,
  SubManifestContentEntry,
  SuperManifest,
} from "./manifest.js";

export interface VerificationFile {
  hash: string;
  cid: string;
  byteLength: number;
}

export interface VerificationSplitFile {
  name: string;
  hash: string;
  byteLength: number;
  parts: VerificationFilePart[];
}

export interface VerificationFilePart {
  name: string;
  byteLength: number;
  cid: string;
  rootCID: string;
  originalFileName: string;
  originalFileHash: string;
  originalFileByteLength: number;
}

export type VerificationDirectory = null;

function manifestKeyCheck(
  sup: SuperManifest,
  sub: SubManifest,
  key: keyof SubManifest & keyof SuperManifest
) {
  if (sub[key] !== sup[key]) {
    throw new Error(
      `Verification failed during manifest '${key}' check, expected '${JSON.stringify(sup[key])}', got '${JSON.stringify(sub[key])}'`
    );
  }
}

export class PieceVerifier {
  #carFile: string;
  #files: Map<string, VerificationFile>;
  #dirs: Map<string, VerificationDirectory>;
  #subManifest: SubManifest | undefined;

  constructor(carFile: string) {
    this.#carFile = carFile;
    this.#files = new Map<string, VerificationFile>();
    this.#dirs = new Map<string, VerificationDirectory>();
  }

  getCarFile(): string {
    return this.#carFile;
  }

  getSubManifest(): SubManifest {
    if (!this.#subManifest) {
      throw new Error(
        "No sub manifest found. Did you call getSubManifest before Verify?"
      );
    }
    return this.#subManifest;
  }

  addFile(path: string, info: VerificationFile) {
    this.#files.set(path, info);
  }

  addDirectory(path: string) {
    this.#dirs.set(path, null);
  }

  verify(subManifest: SubManifest, rootCID: CID): VerificationFilePart[] {
    const fileParts: VerificationFilePart[] = [];
    this.#subManifest = subManifest;

    if (!subManifest.contents) {
      return [];
    }

    // Go through the manifest checking that all the files and directories have been added
    const checkEntries = (
      path: string[],
      entries: SubManifestContentEntry[]
    ) => {
      for (const entry of entries) {
        switch (entry["@type"]) {
          case "file":
            const actualFile = this.#files.get(join(...path, entry.name));
            if (!actualFile) {
              throw new Error(
                `File '${join(...path, entry.name)} in sub manifest but not extracted from CAR '${this.#carFile}'.`
              );
            }
            if (actualFile.byteLength !== entry.byte_length) {
              throw new Error(
                `File '${entry.name}' has size '${String(actualFile.byteLength)}' but sub manifest size is '${String(entry.byte_length)}'.`
              );
            }
            if (actualFile.hash !== entry.hash) {
              throw new Error(
                `File '${entry.name}' has hash '${String(actualFile.hash)}' but sub manifest hash is '${String(entry.hash)}'.`
              );
            }
            if (actualFile.cid !== entry.cid) {
              throw new Error(
                `File '${entry.name}' has CID '${String(actualFile.cid)}' but sub manifest hash is '${String(entry.cid)}'.`
              );
            }
            this.#files.delete(join(...path, entry.name));
            break;

          case "file-part":
            const actualFilePart = this.#files.get(join(...path, entry.name));
            if (!actualFilePart) {
              throw new Error(
                `File part '${entry.name}' in sub manifest but not extracted from CAR.`
              );
            }
            if (actualFilePart.byteLength !== entry.byte_length) {
              throw new Error(
                `File part '${entry.name}' has size '${String(actualFilePart.byteLength)}' but sub manifest size is '${String(entry.byte_length)}'.`
              );
            }
            fileParts.push({
              name: join(...path, entry.name),
              originalFileName: join(...path, entry.original_file_name),
              originalFileHash: entry.original_file_hash,
              originalFileByteLength: entry.original_file_byte_length,
              byteLength: entry.byte_length,
              cid: entry.cid,
              rootCID: rootCID.toString(),
            });
            this.#files.delete(join(...path, entry.name));
            break;

          case "directory":
            const actualDir = this.#dirs.has(join(...path, entry.name));
            if (!actualDir) {
              throw new Error(
                `Directory '${entry.name} in CAR file but not in sub manifest.`
              );
            }
            checkEntries([...path, entry.name], entry.contents);
            this.#dirs.delete(join(...path, entry.name));
            break;
        }
      }
    };

    checkEntries([], subManifest.contents);

    if (this.#files.size) {
      throw new Error(
        `Unpacked files that are not in the sub manifest: ${JSON.stringify(this.#files)}`
      );
    }

    // we don't include the root directory in the manifest so remove that
    this.#dirs.delete(".");

    if (this.#dirs.size) {
      throw new Error(
        `Unpacked directories that are not in the sub manifest: ${JSON.stringify(this.#dirs)}`
      );
    }

    return fileParts;
  }
}

export class Verifier {
  #superManifest: SuperManifest | undefined;
  #pieceCIDs: CID[];

  constructor(manifest: SuperManifest | undefined) {
    this.#superManifest = manifest;
    this.#pieceCIDs = [];
  }

  addPiece(piece: PieceVerifier, pieceCID: CID): void {
    if (this.#pieceCIDs.includes(pieceCID)) {
      throw new Error(
        `Piece CID (CommP) '${pieceCID.toString()}' already processed, only provide unique Pieces`
      );
    }

    if (this.#superManifest) {
      // check this piece is part of the supplied dataset
      for (const key of [
        "@spec_version",
        "@spec",
        "uuid",
        "name",
        "description",
        "version",
        "license",
        "project_url",
        "open_with",
      ]) {
        manifestKeyCheck(
          this.#superManifest,
          piece.getSubManifest(),
          key as keyof SubManifest & keyof SuperManifest
        );
      }

      // Check that this CAR is a piece CID (CommP) from the super manifest
      const found = this.#superManifest.pieces.find(
        (piece) => piece.piece_cid === pieceCID.toString()
      );
      if (!found) {
        console.log(pieceCID.toString(), this.#superManifest.pieces);
        throw new Error(
          `Piece CID (CommP) '${pieceCID.toString()}' does not match any pieces from super manifest`
        );
      }

      // TODO: Check that the files, directories are all in the superManifest

      // TODO: Check that there are no extra files or directories that are not in the super manifest
    }

    this.#pieceCIDs.push(pieceCID);
  }

  verifyPieces(splitFiles: Map<string, VerificationSplitFile>) {
    if (this.#superManifest) {
      if (this.#superManifest.n_pieces !== this.#pieceCIDs.length) {
        throw new Error(
          `Wrong number of CARs (pieces) '${String(this.#pieceCIDs.length)}' provided, expected '${String(this.#superManifest.n_pieces)}'`
        );
      }

      // TODO: Check all the joined files are complete

      // TODO: check there are no missing joined files
      console.log(splitFiles);
    }
  }
}
