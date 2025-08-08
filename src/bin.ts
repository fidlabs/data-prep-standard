#!/usr/bin/env node
import fs from "node:fs";

import { Command } from "commander";

const pkg = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url)).toString()
) as {
  name: string;
  version: string;
};
const cli = new Command();
cli.name(pkg.name);

cli.version(pkg.version);

cli
  .command("pack")
  .argument("<files...>")
  .summary(
    "Pack files into one or more Content Addressable aRchives (CARs) with manifests."
  )
  .description(
    `Pack files into one or more Content Addressable aRchives (CARs) with manifests.

The resulting CAR files will be suitable for use with Filecoin and IPFS, and will
each include a manifest file that describes the contents of the CAR.

In addition, a super-manifest will be created that contains metadata about the dataset,
including references to all the Filecoin deal pieces.

You must provide a JSON file with manifest metadata containing the following fields:
- "name": The name of the dataset.
- "description": A description of the dataset.
- "version": The version of the dataset, typically a date in YYYY-MM-DD format.
- "license": The SPDX-License-Identifier for the license of the dataset.
- "project_url": A URL to the dataset project website.
- "open_with": Guidance on what tool is needed to use the dataset.
- "tags": An optional array of tag strings for the dataset.  Can be used to aid dataset discovery.`
  )
  .requiredOption("-m, --metadata <file>", "JSON file with manifest metadata.")
  .requiredOption("-o, --output <dir>", "Output directory.")
  .option("-H, --hidden", 'Include paths that start with ".".', false)
  .option("-l, --lite", "Don't include contents in the manifests.", false)
  .option(
    "--spec-version",
    "version of the metadata specification to use.",
    "0.1.0"
  )
  .option("--target-car-size <size>", "Target size of CAR files.", "32GB")
  .action(createAction("./cmd/pack.js"));

cli
  .command("unpack")
  .argument("<CAR...>")
  .summary("Unpack files and directories from a [set of] CAR[s].")
  .description("Unpack files and directories from a [set of] CAR[s].")
  .option(
    "-s, --super-manifest <file>",
    "Super-manifest for the dataset. If supplied will be used to verify the full dataset."
  )
  .option("--verify", "Verify block hash consistency.", true)
  .option("--verbose", "Show file names while unpacking.", false)
  .requiredOption("-o, --output <dir>", "Output directory.")
  .action(createAction("./cmd/unpack.js"));

cli
  .command("ls")
  .argument("<CAR>")
  .summary("List files and directories from a CAR.")
  .description("List files and directories from a CAR.")
  .option("-r, --root", "Root CID to list files from.")
  .option("--verbose", "Print file CIDs and byte sizes.")
  .action(createAction("./cmd/ls.js"));

cli
  .command("verify")
  .argument("<CAR...>")
  .summary("Verify CAR contents from manifests.")
  .description("Verify CAR contents from manifests.")
  .option(
    "-s, --super-manifest <file>",
    "Super-manifest for the dataset. If supplied will be used to verify the full dataset."
  )
  .action(createAction("./cmd/verify.js"));

cli.parse(process.argv);

/** @param {string} modulePath */
function createAction(modulePath: string) {
  return async (...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const module = await import(modulePath);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return module.default(...args);
  };
}
