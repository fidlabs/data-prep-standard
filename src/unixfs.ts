/* eslint-disable n/no-unsupported-features/node-builtins */
import { Readable } from "node:stream";

import type { Block, View } from "@ipld/unixfs";
import * as UnixFS from "@ipld/unixfs";
import { withMaxChunkSize } from "@ipld/unixfs/file/chunker/fixed";
import { withWidth } from "@ipld/unixfs/file/layout/balanced";
import * as raw from "multiformats/codecs/raw";

import type { SplitFileLike } from "./files.js";
import type {
  ManifestContentEntry,
  SubManifest,
  UserMetadata,
} from "./manifest.d.js";

const SHARD_THRESHOLD = 1000; // shard directory after > 1,000 items
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const queuingStrategy = UnixFS.withCapacity();

const defaultSettings = UnixFS.configure({
  fileChunkEncoder: raw,
  smallFileEncoder: raw,
  chunker: withMaxChunkSize(1024 * 1024),
  fileLayout: withWidth(1024),
});

// export function createFileEncoderStream (blob: FileLike, settings: UnixFS.EncoderSettings = defaultSettings): ReadableStream<Block> {
//   const { readable, writable } = new TransformStream<Block,Block>({}, queuingStrategy)
//   const unixfsWriter = UnixFS.createWriter({ writable, settings })
//   const fileBuilder = new UnixFsFileBuilder(blob)
//   ;void (async () => {
//     await fileBuilder.finalize(unixfsWriter)
//     await unixfsWriter.close()
//   })()

//   return readable
// }

class UnixFsFileBuilder {
  #file;

  constructor(file: { name: string; stream: () => ReadableStream }) {
    this.#file = file;
  }

  async finalize(writer: View, manifest: ManifestContentEntry[]) {
    const unixfsFileWriter = UnixFS.createFileWriter(writer);
    await this.#file.stream().pipeTo(
      new WritableStream({
        async write(chunk: Uint8Array) {
          await unixfsFileWriter.write(chunk);
        },
      })
    );
    // Note: added await here, check on performance implications
    const link = await unixfsFileWriter.close();
    manifest.push({
      type: "file",
      name: this.#file.name,
      cid: link.cid.toString(),
      byte_length: link.contentByteLength,
      // content_type: mime.getType(entry) ?? undefined
    });
    return link;
  }
}

class UnixFSDirectoryBuilder {
  #name;
  entries = new Map<string, UnixFsFileBuilder | UnixFSDirectoryBuilder>();

  constructor(name: string) {
    this.#name = name;
  }

  async _finalize(writer: View, manifest: ManifestContentEntry[]) {
    const dirWriter =
      this.entries.size <= SHARD_THRESHOLD ?
        UnixFS.createDirectoryWriter(writer)
      : UnixFS.createShardedDirectoryWriter(writer);
    for (const [name, entry] of this.entries) {
      const link = await entry.finalize(writer, manifest);
      dirWriter.set(name, link);
    }
    return dirWriter;
  }

  async finalize(writer: View, manifest: ManifestContentEntry[]) {
    const contents: ManifestContentEntry[] = [];

    const dirWriter = await this._finalize(writer, contents);
    // Note: added await here, check on performance implications
    const link = await dirWriter.close();
    manifest.push({
      type: "directory",
      name: this.#name,
      cid: link.cid.toString(),
      contents: contents,
    });
    return link;
  }

  async manifest(
    writer: View,
    opts: {
      metadata: UserMetadata;
      uuid: string;
      spec: string;
      specVersion: string;
    }
  ): Promise<SubManifest> {
    const subManifest: SubManifest = {
      "@spec": opts.spec,
      "@spec_version": opts.specVersion,
      ...opts.metadata,
      uuid: opts.uuid,
      contents: [],
    };

    // finalize all the contents of the directory, capturing the manifest entries
    const dirWriter = await this._finalize(writer, subManifest.contents);

    // write the manifest file to the directory
    const unixfsFileWriter = UnixFS.createFileWriter(writer);
    const buf = Buffer.from(JSON.stringify(subManifest, null, 2));

    await Readable.toWeb(Readable.from(buf)).pipeTo(
      new WritableStream({
        async write(chunk: Uint8Array) {
          await unixfsFileWriter.write(chunk);
        },
      })
    );
    const man = await unixfsFileWriter.close();
    dirWriter.set("manifest.json", man);
    await dirWriter.close();

    return subManifest;
  }
}

export function createDirectoryEncoderStream(
  files: Iterable<SplitFileLike>,
  opts: {
    metadata: UserMetadata;
    uuid: string;
    spec: string;
    specVersion: string;
  }
): { stream: ReadableStream<Block>; close: Promise<SubManifest> } {
  const rootDir = new UnixFSDirectoryBuilder(".");

  for (const file of files) {
    const path = file.name.split("/");
    if (path[0] === "" || path[0] === ".") {
      path.shift();
    }
    let dir = rootDir;
    for (const [i, name] of path.entries()) {
      if (i === path.length - 1) {
        dir.entries.set(name, new UnixFsFileBuilder(file));
        break;
      }
      let dirBuilder = dir.entries.get(name);
      if (dirBuilder == null) {
        dirBuilder = new UnixFSDirectoryBuilder(name);
        dir.entries.set(name, dirBuilder);
      }
      if (!(dirBuilder instanceof UnixFSDirectoryBuilder)) {
        throw new Error(`"${name}" cannot be a file and a directory`);
      }
      dir = dirBuilder;
    }
  }

  const { readable, writable } = new TransformStream<Block, Block>(
    {},
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    queuingStrategy
  );
  const unixfsWriter = UnixFS.createWriter({
    writable,
    settings: defaultSettings,
  });
  const close = async (): Promise<SubManifest> => {
    // console.log("closing")
    const manifest = await rootDir.manifest(unixfsWriter, opts);
    await unixfsWriter.close();
    return manifest;
  };

  return { stream: readable, close: close() };
}
