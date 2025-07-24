import { randomUUID } from "node:crypto";

import { CID } from "multiformats/cid";

export interface UserMetadata {
  name: string;
  description: string;
  version: string;
  license: string;
  project_url: string;
  open_with: string;
  tags?: string[];
}

interface ManifestBase extends UserMetadata {
  "@spec": string;
  "@spec_version": string;
  uuid: string;
}

export interface SuperManifestContentDirectory {
  "@type": "directory";
  name: string;
  contents: SuperManifestContentEntry[];
}

export interface SuperManifestContentFile {
  "@type": "file";
  name: string;
  hash: string;
  byte_length: number;
  cid: string;
  piece_cid: string;
  media_type?: string;
}

export interface SuperManifestContentSplitFile {
  "@type": "split-file";
  name: string;
  hash: string;
  byte_length: number;
  media_type?: string;
  parts: SuperManifestContentFilePart[];
}

export interface SuperManifestContentFilePart {
  name: string;
  byte_length: number;
  cid: string;
  piece_cid: string;
}

export type SuperManifestContentEntry =
  | SuperManifestContentDirectory
  | SuperManifestContentFile
  | SuperManifestContentSplitFile;

export interface SuperManifest extends ManifestBase {
  n_pieces: number;
  pieces: {
    piece_cid: string;
    payload_cid: string;
  }[];
  contents?: SuperManifestContentEntry[];
}

export interface SubManifestContentDirectory {
  "@type": "directory";
  name: string;
  contents: SubManifestContentEntry[];
}

export interface SubManifestContentFile {
  "@type": "file";
  name: string;
  hash: string;
  byte_length: number;
  cid: string;
  media_type?: string;
  // Can we get byte offset of the entire file in the CAR binary?
}

export interface SubManifestContentFilePart {
  "@type": "file-part";
  name: string;
  byte_length: number;
  cid: string;
  original_file_name: string;
  original_file_hash: string;
  original_file_byte_length: number;
  // Can we get byte offset of the entire part in the CAR binary?
}

export type SubManifestContentEntry =
  | SubManifestContentDirectory
  | SubManifestContentFile
  | SubManifestContentFilePart;

export interface SubManifest extends ManifestBase {
  contents?: SubManifestContentEntry[];
}

function specFromVersion(version: string): string {
  const match = /^([0-9]+)\./.exec(version);

  if (!match || match.length !== 2 || match[1] === undefined) {
    throw new Error(`Invalid spec version: ${version}`);
  }

  return `https://raw.githubusercontent.com/fidlabs/data-prep-standard/refs/heads/main/specification/v${match[1]}/FilecoinDataPreparationManifestSpecification.md`;
}

export class Manifest implements SuperManifest {
  "@spec": string;
  "@spec_version": string;
  uuid: string;
  name: string;
  description: string;
  version: string;
  license: string;
  project_url: string;
  n_pieces: number;
  open_with: string;
  pieces: { piece_cid: string; payload_cid: string }[];
  tags?: string[];
  contents?: SuperManifestContentEntry[];

  #lite: boolean;

  constructor(
    metadata: UserMetadata,
    specVersion: string,
    opts: { lite?: boolean } = {}
  ) {
    if (specVersion !== "0.1.0") {
      throw new Error(
        `Unsupported schema version: ${specVersion}. Only 0.1.0 is supported.`
      );
    }

    this["@spec_version"] = specVersion;
    this["@spec"] = specFromVersion(specVersion);
    this.uuid = randomUUID();
    this.name = metadata.name;
    this.description = metadata.description;
    this.version = metadata.version;
    this.license = metadata.license;
    this.project_url = metadata.project_url;
    this.open_with = metadata.open_with;
    this.tags = metadata.tags;
    this.n_pieces = 0;
    this.pieces = [];
    this.#lite = opts.lite ?? false;
  }

  newSubManifest(): SubManifest {
    return {
      "@spec": this["@spec"],
      "@spec_version": this["@spec_version"],
      uuid: randomUUID(),
      name: this.name,
      description: this.description,
      version: this.version,
      license: this.license,
      project_url: this.project_url,
      open_with: this.open_with,
      tags: this.tags,
      contents: this.#lite ? undefined : [],
    };
  }

  addPiece(subManifest: SubManifest, pieceCID: CID, rootCID: CID): void {
    this.n_pieces++;
    this.pieces.push({
      piece_cid: pieceCID.toString(),
      payload_cid: rootCID.toString(),
    });

    if (this.#lite) {
      return;
    }

    this.contents ??= [];
    mergeSubManifestContent(
      this.contents,
      pieceCID,
      ...(subManifest.contents ?? [])
    );
  }
}

function mergeSubManifestContent(
  target: SuperManifestContentEntry[],
  pieceCid: CID,
  ...sources: SubManifestContentEntry[]
): void {
  if (!sources.length) return;

  for (const source of sources) {
    switch (source["@type"]) {
      case "file":
        target.push({
          ...source,
          piece_cid: pieceCid.toString(),
        });
        break;

      case "file-part":
        // try and find an existing split-file that this is a part of
        let splitFile = target.find(
          (t) =>
            t["@type"] === "split-file" && t.name === source.original_file_name
        ) as SuperManifestContentSplitFile | undefined;

        if (!splitFile) {
          // if not then create one
          splitFile = {
            "@type": "split-file",
            name: source.original_file_name,
            hash: source.original_file_hash,
            byte_length: source.original_file_byte_length,
            parts: [],
          };
          target.push(splitFile);
        }
        splitFile.parts.push({
          name: source.name,
          byte_length: source.byte_length,
          cid: source.cid,
          piece_cid: pieceCid.toString(),
        });
        break;

      case "directory":
        // try and find an existing directory of the same name from another piece
        let directory = target.find(
          (t) => t["@type"] === "directory" && t.name === source.name
        ) as SuperManifestContentDirectory | undefined;

        if (!directory) {
          // if not then create one
          directory = {
            "@type": "directory",
            name: source.name,
            contents: [],
          };
          target.push(directory);
        }
        mergeSubManifestContent(
          directory.contents,
          pieceCid,
          ...source.contents
        );
        break;

      default:
        throw new Error("unexpected source type");
    }
  }
}
