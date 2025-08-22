import { join } from "node:path";

import { CID } from "multiformats";

import {
  SubManifest,
  SubManifestContentEntry,
  SuperManifest,
  SuperManifestContentEntry,
} from "./manifest.js";

export interface VerificationFile {
  hash: string;
  cid: string;
  byteLength: number;
}

export interface VerificationSplitFile {
  hash: string;
  byteLength: number;
}

export interface VerificationFilePart {
  name: string;
  byteLength: number;
  cid: string;
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

class PieceVerifier {
  #carFile: string;
  #files: Map<string, VerificationFile>;
  #dirs: Map<string, VerificationDirectory>;
  #superManifest: SuperManifest | undefined;

  constructor(carFile: string, superManifest?: SuperManifest) {
    this.#carFile = carFile;
    this.#files = new Map<string, VerificationFile>();
    this.#dirs = new Map<string, VerificationDirectory>();
    this.#superManifest = superManifest;
  }

  addFile(path: string, info: VerificationFile) {
    this.#files.set(path, info);
  }

  addDirectory(path: string) {
    this.#dirs.set(path, null);
  }

  verify(subManifest: SubManifest): VerificationFilePart[] {
    const fileParts: VerificationFilePart[] = [];

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
          subManifest,
          key as keyof SubManifest & keyof SuperManifest
        );
      }

      // We don't check the unpacked files against the super manifest contents as they will
      // all be checked against the sub manifest contents.

      // We could choose to verify that the sub manifest and the super manifest contents
      // are consistent, but that would be a malformed set of manifests, which is not what
      // we are verifying here, we are verifying that all the files are as declared by the
      // manifests.
    }

    if (!subManifest.contents) {
      // This dataset was packed --lite, so we can't verify the contents and we don't
      // support split files
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
                `File '${join(...path, entry.name)}' in sub manifest but not found in CAR '${this.#carFile}'.`
              );
            }
            if (actualFile.byteLength !== entry.byte_length) {
              throw new Error(
                `File '${entry.name}' has size '${String(actualFile.byteLength)}' but sub manifest size is '${String(entry.byte_length)}'.`
              );
            }
            if (actualFile.hash !== entry.hash) {
              throw new Error(
                `File '${entry.name}' has hash '${actualFile.hash}' but sub manifest hash is '${entry.hash}'.`
              );
            }
            if (actualFile.cid !== entry.cid) {
              throw new Error(
                `File '${entry.name}' has CID '${actualFile.cid}' but sub manifest hash is '${entry.cid}'.`
              );
            }
            // we remove the verified file from the map so we can check for extra files below
            this.#files.delete(join(...path, entry.name));
            break;

          case "file-part":
            const actualFilePart = this.#files.get(join(...path, entry.name));
            if (!actualFilePart) {
              throw new Error(
                `File part '${entry.name}' in sub manifest but not found in CAR '${this.#carFile}'.`
              );
            }
            if (actualFilePart.byteLength !== entry.byte_length) {
              throw new Error(
                `File part '${entry.name}' has size '${String(actualFilePart.byteLength)}' but sub manifest size is '${String(entry.byte_length)}'.`
              );
            }
            if (actualFilePart.cid !== entry.cid) {
              throw new Error(
                `File part '${entry.name}' has CID '${actualFilePart.cid}' but sub manifest hash is '${entry.cid}'.`
              );
            }
            fileParts.push({
              name: join(...path, entry.name),
              originalFileName: join(...path, entry.original_file_name),
              originalFileHash: entry.original_file_hash,
              originalFileByteLength: entry.original_file_byte_length,
              byteLength: entry.byte_length,
              cid: entry.cid,
            });

            // we remove the verified file from the map so we can check for extra ones below
            this.#files.delete(join(...path, entry.name));
            break;

          case "directory":
            const actualDir = this.#dirs.has(join(...path, entry.name));
            if (!actualDir) {
              throw new Error(
                `Directory '${entry.name}' in sub manifest but not found in CAR '${this.#carFile}'.`
              );
            }
            checkEntries([...path, entry.name], entry.contents);
            // we remove the verified directory from the map so we can check for extra ones below
            this.#dirs.delete(join(...path, entry.name));
            break;
        }
      }
    };

    checkEntries([], subManifest.contents);

    // Any remaining files in the map are spurious and unexpected
    if (this.#files.size) {
      throw new Error(
        `Unpacked files that are not in the sub manifest: ${JSON.stringify(this.#files)}`
      );
    }

    // we don't include the root directory in the manifest so remove that
    this.#dirs.delete(".");

    // Any remaining directories in the map are spurious and unexpected
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

  constructor(manifest?: SuperManifest) {
    this.#superManifest = manifest;
    this.#pieceCIDs = [];
  }

  newPieceVerifier(file: string, payloadCID: CID, pieceCID: CID) {
    if (this.#pieceCIDs.includes(pieceCID)) {
      throw new Error(
        `Piece CID (CommP) '${pieceCID.toString()}' already processed, only provide unique Pieces`
      );
    }

    if (this.#superManifest) {
      // Check that this CAR is a piece CID (CommP) from the super manifest
      const found = this.#superManifest.pieces.find(
        (piece) => piece.piece_cid === pieceCID.toString()
      );
      if (!found) {
        throw new Error(
          `Piece CID (CommP) '${pieceCID.toString()}' does not match any pieces from super manifest '${JSON.stringify(this.#superManifest.pieces)}'`
        );
      }
      if (found.payload_cid !== payloadCID.toString()) {
        throw new Error(
          `Payload CID '${payloadCID.toString()}' does not match the piece from super manifest '${JSON.stringify(found)}'`
        );
      }
    }

    this.#pieceCIDs.push(pieceCID);

    return new PieceVerifier(file, this.#superManifest);
  }

  verifyPieces(splitFiles: Map<string, VerificationSplitFile>) {
    if (this.#superManifest) {
      if (this.#superManifest.n_pieces !== this.#pieceCIDs.length) {
        throw new Error(
          `Wrong number of CARs (pieces) '${String(this.#pieceCIDs.length)}' provided, expected '${String(this.#superManifest.n_pieces)}'`
        );
      }

      if (!this.#superManifest.contents) {
        return;
      }

      // Go through the manifest checking that all the split files have been added
      const checkEntries = (
        path: string[],
        entries: SuperManifestContentEntry[]
      ) => {
        for (const entry of entries) {
          switch (entry["@type"]) {
            case "split-file":
              const actualFile = splitFiles.get(join(...path, entry.name));
              if (!actualFile) {
                throw new Error(
                  `Split file '${join(...path, entry.name)}' in super manifest but not found in any CAR.`
                );
              }
              if (actualFile.byteLength !== entry.byte_length) {
                throw new Error(
                  `File '${entry.name}' has size '${String(actualFile.byteLength)}' but super manifest size is '${String(entry.byte_length)}'.`
                );
              }
              if (actualFile.hash !== entry.hash) {
                throw new Error(
                  `File '${entry.name}' has hash '${actualFile.hash}' but super manifest hash is '${entry.hash}'.`
                );
              }
              splitFiles.delete(join(...path, entry.name));
              break;

            case "directory":
              checkEntries([...path, entry.name], entry.contents);
              break;
          }
        }
      };

      checkEntries([], this.#superManifest.contents);

      if (splitFiles.size) {
        throw new Error(
          `Unpacked split files that are not in the super manifest: ${JSON.stringify(splitFiles)}`
        );
      }
    }
  }
}
