import { CarIndexedReader } from "@ipld/car/indexed-reader";
import { recursive as exporter } from "ipfs-unixfs-exporter";

export default async function ls(
  carPath: string,
  opts: { root?: string; verbose: boolean }
) {
  const reader = await CarIndexedReader.fromFile(carPath);
  const roots = await reader.getRoots();
  const rootCID = opts.root ?? roots[0];
  if (!rootCID) {
    throw new Error(`No root CID supplied or found in CAR: ${carPath}`);
  }

  const entries = exporter(rootCID, {
    async get(cid) {
      const block = await reader.get(cid);
      if (!block) {
        throw new Error(`Missing block: ${cid.toString()}`);
      }
      return block.bytes;
    },
  });

  const prefix = rootCID.toString();
  for await (const entry of entries) {
    if (
      entry.type === "file" ||
      entry.type === "raw" ||
      entry.type === "directory"
    ) {
      if (opts.verbose) {
        const size = entry.type === "directory" ? "-" : entry.size;
        console.log(
          `${entry.cid.toString()}\t${String(size)}\t${entry.path.replace(prefix, ".")}`
        );
      } else {
        console.log(entry.path.replace(prefix, "."));
      }
    }
  }
  await reader.close();
}
