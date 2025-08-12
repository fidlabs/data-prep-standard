import { readFileSync } from "node:fs";

import { SuperManifest } from "../manifest.js";
import { Verifier } from "../verifier.js";
import verify from "../verify.js";

export default async function verifyCars(
  files: string[],
  opts: {
    superManifest?: string;
    verbose: boolean;
  }
): Promise<void> {
  console.log("unpack", files, opts);

  let superManifest: SuperManifest | undefined;

  if (opts.superManifest) {
    // We have been provided with a super manifest, so load it and use it to
    // check all the CARs
    superManifest = JSON.parse(
      readFileSync(opts.superManifest, "utf-8")
    ) as SuperManifest;

    if (files.length != superManifest.n_pieces) {
      throw new Error(
        `Super manifest specifies ${String(superManifest.n_pieces)} pieces and you have only provided ${String(files.length)} CAR files.`
      );
    }
  }
  const verifier = new Verifier(superManifest);

  await verify(files, verifier);
}
