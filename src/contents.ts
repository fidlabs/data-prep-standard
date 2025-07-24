import { CID } from "multiformats/cid";

import type {
  SubManifestContentEntry,
  SuperManifestContentDirectory,
  SuperManifestContentEntry,
  SuperManifestContentSplitFile,
} from "./manifest.d.js";

export function mergeDeep(
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
        mergeDeep(directory.contents, pieceCid, ...source.contents);
        break;

      default:
        throw new Error("unexpected source type");
    }
  }
}
