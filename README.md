# data-prep-standard

This repository contains a specification for an extensible and interoperable manifest format for datasets stored on Filecoin```
and a command line tool for creating and verifying prepared data from / to unix file system.

## Introduction

It is hard to have confidence (or prove to the world in general) that files and data stored
on Filecoin are actually present, findable, and retrievable in a real storage. For instance,
useful public open data sets are stored on Filecoin but are not widely used because they
are hard to find and download (AKA ‘the retrievability problem’). One significant reason for
this is actually at the creation end, not the retrieval end: the preparation of files into
archives and then into Filecoin deals is not sufficiently standardized to make user-level
interactions reasonable or scalable.

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

Further, in each stored piece of the dataset, there is a sub-manifest which contains the
same metadata as the super-manifest, but with only the file system manifest section for that
specific piece.

## Manifest specification

The specification is define [here](./specification/README.md)

## Contributing

Feel free to join in. All welcome. [Open an issue](https://github.com/fidlabs/data-prep-standard/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/...)