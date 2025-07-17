export interface UserMetadata {
  name: string;
  description: string;
  version: string;
  license: string;
  project_url: string;
  open_with: string;
  tags?: string[];
}

export interface ManifestContentDirectory {
  type: "directory";
  name: string;
  cid: string;
  contents: ManifestContentEntry[];
}

export interface ManifestContentFile {
  type: "file";
  name: string;
  byte_length: number;
  cid: string;
  content_type?: string;
}

export type ManifestContentEntry =
  | ManifestContentDirectory
  | ManifestContentFile;

interface ManifestBase extends UserMetadata {
  "@spec": string;
  "@spec_version": string;
  uuid: string;
}

export interface SuperManifest extends ManifestBase {
  n_pieces: number;
  pieces: [
    {
      piece_cid: string;
      payload_cid: string;
      contents: ManifestContentEntry[];
    },
  ];
}

export interface SubManifest extends ManifestBase {
  contents: ManifestContentEntry[];
}
