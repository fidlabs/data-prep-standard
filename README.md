# data-prep-standard

This repository contains a specification for an extensible and interoperable manifest format for datasets stored on Filecoin```
and a command line tool for creating and verifying prepared data from / to unix file system.

## Introduction

Filecoin provides storage for some extremely useful and valuable data sets, but thy are not as easy to find and use as they might be owing to the fact that they are prepared, compressed, stored, and indexed in different ways by different data set owners and Storage Providers.

Because of these differences, even when one data set is well documented and locatable, that does not necessarily help a user to find and download other similar datasets.

This project provides a data formatting standard and set of tooling that make it
easy for motivated actors to store files on Filecoin using interoperable and standardized
techniques and provide an easy way for them - and potentially 3rd parties - to identify
and validate the files from the source data set once they are stored in a Deal.

## Filecoin data preparation

To prepare the files for a Filecoin Deal they must first be organized into a UnixFS directory
tree (known as the canonical form), a CID (Content ID) calculated for every UnixFS node
(including directory nodes), and then packed into CAR files (Content Addressed aRchives)
along with a manifest specifying all the files in the CAR along with their essential metadata
(timestamps, CIDs etc).

In order to support the identification and verification of source data files this project
defines a super-manifest which a data provider publishes using their existing communication
channels (git repository, website, etc) and which identifies the dataset piece identifiers,
provides human readable guidance on the content of the dataset, and contains a manifest of
all the file system entities (directories and files) contained in each piece of the dataset.

Further, to support efficient partial downloads, in each stored piece of the dataset, there is a sub-manifest which contains the
same metadata as the super-manifest, but with only the file system manifest section for that
specific piece.

## Manifest specification

The specification is define [here](./specification/README.md)

## Contributing

Feel free to join in. All welcome. [Open an issue](https://github.com/fidlabs/data-prep-standard/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/...)