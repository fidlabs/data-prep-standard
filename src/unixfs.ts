/* eslint-disable n/no-unsupported-features/node-builtins */
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import type { Block, View } from "@ipld/unixfs";
import * as UnixFS from "@ipld/unixfs";
import { withMaxChunkSize } from "@ipld/unixfs/file/chunker/fixed";
import { withWidth } from "@ipld/unixfs/file/layout/balanced";
import * as raw from "multiformats/codecs/raw";

import type { SplitFileLike } from "./files.js";
import type {
  SubManifest,
  SubManifestContentEntry,
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

  constructor(file: SplitFileLike) {
    this.#file = file;
  }

  async finalize(
    writer: View,
    manifest: SubManifestContentEntry[] | undefined
  ) {
    const unixfsFileWriter = UnixFS.createFileWriter(writer);
    let stream = this.#file.stream();
    let hash = "";
    const promises: Promise<void>[] = [];

    if (!this.#file.originalInfo && manifest) {
      // This is whole file, so we need to hash it
      const [a, b] = stream.tee();
      stream = a;

      const hasher = createHash("sha256").setEncoding("hex");
      hasher.on("readable", () => {
        // Only one element is going to be produced by the
        // hash stream.
        const data = hasher.read() as undefined | Buffer;
        if (data?.length) {
          hash = data.toString("hex");
        }
      });
      promises.push(pipeline(b, hasher));
    }

    promises.push(
      stream.pipeTo(
        new WritableStream({
          async write(chunk: Uint8Array) {
            await unixfsFileWriter.write(chunk);
          },
        })
      )
    );

    await Promise.all(promises);
    // Note: added await here, check on performance implications
    const link = await unixfsFileWriter.close();

    if (!this.#file.originalInfo) {
      manifest?.push({
        "@type": "file",
        name: this.#file.name,
        cid: link.cid.toString(),
        hash,
        byte_length: link.contentByteLength,
        media_type: this.#file.media_type,
      });
    } else {
      // This is part of a split file
      manifest?.push({
        "@type": "file-part",
        name: this.#file.name,
        cid: link.cid.toString(),
        byte_length: link.contentByteLength,
        original_file_name: this.#file.originalInfo.name,
        original_file_hash: this.#file.originalInfo.hash,
        original_file_byte_length: this.#file.originalInfo.size,
      });
    }

    return link;
  }
}

class UnixFSDirectoryBuilder {
  #name;
  entries = new Map<string, UnixFsFileBuilder | UnixFSDirectoryBuilder>();

  constructor(name: string) {
    this.#name = name;
  }

  async _finalize(
    writer: View,
    manifest: SubManifestContentEntry[] | undefined
  ) {
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

  async finalize(
    writer: View,
    manifest: SubManifestContentEntry[] | undefined
  ) {
    const contents: SubManifestContentEntry[] = [];

    const dirWriter = await this._finalize(writer, contents);
    // Note: added await here, check on performance implications
    const link = await dirWriter.close();
    manifest?.push({
      "@type": "directory",
      name: this.#name,
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
      lite: boolean;
      specVersion: string;
    }
  ): Promise<SubManifest> {
    const subManifest: SubManifest = {
      "@spec": opts.spec,
      "@spec_version": opts.specVersion,
      ...opts.metadata,
      uuid: opts.uuid,
      contents: opts.lite ? undefined : [],
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
    lite: boolean;
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
