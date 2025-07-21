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
  parts: SuperManifestFilePart[];
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
}

export interface SubManifestContentFilePart {
  "@type": "file-part";
  name: string;
  byte_length: number;
  cid: string;
  original_file_name: string;
  original_file_hash: string;
  original_file_byte_length: number;
}

export type SubManifestContentEntry =
  | SubManifestContentDirectory
  | SubManifestContentFile
  | SubManifestContentFilePart;

export interface SubManifest extends ManifestBase {
  contents?: SubManifestContentEntry[];
}
