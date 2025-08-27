# data-prep-standard

This repository contains a specification for an extensible and interoperable manifest
format for datasets stored on Filecoin and a command line tool for creating and
verifying prepared data from / to unix file system.

## Introduction

Filecoin provides storage for some extremely useful and valuable data sets, but they are
not as easy to find and use as they might be owing to the fact that they are prepared,
compressed, stored, and indexed in different ways by different data set owners and
Storage Providers.

Because of these differences, even when one data set is well documented and locatable,
that does not necessarily help a user to find and download other similar datasets.

This project provides an *interoperable* and *standardized* data set manifest and a
standardized method of preparing data to produce that manifest. Between these and a
reference implementation of data prep tooling, it becomes easy for motivated actors to
store data sets on Filecoin and provide an easy way for them - and potentially 3rd
parties - to identify, download and use the data set once stored on Filecoin.

## Filecoin data preparation

This project sticks with traditional Filecoin canonical form - ie CAR files with UnixFS.

Files larger than a 32GB are recorded in the manifest as a single content-addressable file
but will be packed and stored across multiple Pieces and Sectors. The manifest points to
all the parts of the file in such cases.

In order to support the identification and verification of source data files this project
defines a super-manifest which a data provider publishes using their existing communication
channels (git repository, website, etc) and which identifies the dataset piece identifiers,
provides human readable guidance on the content of the dataset, and contains a manifest of
all the file system entities (directories and files) contained in each piece of the dataset.

Further, to support efficient partial downloads, in each stored piece of the dataset,
there is a sub-manifest which contains the same metadata as the super-manifest, but with
only the file system manifest section for that specific piece. Length and offset data also
enables range queries should they be wanted.

<img width="611" height="750" alt="Data landscape for dataprep project" src="https://github.com/user-attachments/assets/78472a3f-c7b2-41da-a1ed-4bde933f3161" />

## Manifest specification

The specification and all its versions are defined [here](./specification/README.md)

## Building and installing the reference tools

### Requirements

Runs on major Linux flavors and Mac. Support for Windows and WSL2 is not guaranteed.

Requires node versions 18, 20 or 22

### Build and install

Install dependencies and build the tools:
`npm install`
`npm run build`

Optionally test the build succeeded:
`npm run test:system`

Install for local use:
`npm install -g .`

### Running the tooling

Full usage message is displayed with `--help`:

`filecoin-prep --help`

```bash
Usage: filecoin-prep [options] [command]

Options:
  -V, --version              output the version number
  -h, --help                 display help for command

Commands:
  pack [options] <files...>  Pack files into one or more Content Addressable aRchives (CARs) with manifests.
  unpack [options] <CAR...>  Unpack files and directories from a [set of] CAR[s].
  ls [options] <CAR>         List files and directories from a CAR.
  verify [options] <CAR...>  Verify CAR contents from manifests.
  help [command]             display help for command
```

#### Preparing data

To prepare and pack data you will require a metadata file including basic information about the data set:

```json
{
    "name": "The Uncensored Library",
    "description": "Minecraft map from Journalists Without Borders containing important news that needs to be preserved.",
    "version": "2025/08/11",
    "license": "MIT",
    "project_url": "https://www.uncensoredlibrary.com/en",
    "open_with": "Minecraft Server"
}
```

To pack the contents of a directory into CARs with a manifest:

`filecoin-prep pack -m [metadata_file] -o [output_dir] [files...]`

To view advanced options for `pack`:

`filecoin-prep pack --help`

#### Unpacking prepared data

To unpack a downloaded piece:

`filecoin-prep unpack [car...]`

To view advanced options for `unpack`:

`filecoin-prep unpack --help`

## Contributing

Feel free to join in. All welcome. [Open an issue](https://github.com/fidlabs/data-prep-standard/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/fidlabs/data-prep-standard/blob/main/LICENSE.md)
