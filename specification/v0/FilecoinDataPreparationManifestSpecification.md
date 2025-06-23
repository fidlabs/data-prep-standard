# Filecoin Data Preparation Manifest Specification

## Introduction

This specification defines an extensible and interoperable format for content manifests for datasets stored on Filecoin.

### Versioning

Filecoin Data Preparation Manifest Specification versions follow [SemVer 2.0.0](https://semver.org/)

## Super-manifest

```
{
    "@schema": "URL to version of the manifest specification used for this manifest",
    "@schema_version": "SemVer version number of the specification used for this manifest",
    "name": "Name of the dataset, max 256 characters",
    "description": "Description of the dataset, max 4K characters",
    "license": "Names of the license(s) the dataset is distributed under, max 64 characters, e.g. 'Apache-2.0 or MIT`",
    "url": "Dataset project URL, max 2048 characters",
    "uuid": "Tooling assigned unique ID for this dataset",
    "n_pieces": 4,
    "tags": ["tags", "for the", "dataset"],
    "pieces": [
        "piece_cid": "CID for the piece when part of a Filecoin deal",
        "payload_cid", "CID for the payload within the piece (CAR CID)",
        "contents": [
            {
                "type": "file | directory",
                "name": "file / directory name",
                "cid": "node CID for the file / directory",
                "content_type": "optional mime type if file",
                "contents": []
            }
        ]
    ]
}
```

## Sub-manifest

```
{
    "@schema": "URL to version of the manifest specification used for this manifest",
    "@schema_version": "SemVer version number of the specification used for this manifest",
    "description": "Description of the dataset, max 4K characters",
    "license": "Names of the license(s) the dataset is distributed under, max 64 characters, e.g. 'Apache-2.0 or MIT`",
    "url": "Dataset project URL, max 2048 characters",
    "uuid": "Tooling assigned unique ID for this dataset",
    "n_pieces": 4,
    "tags": ["tags", "for the", "dataset"],
    "payload_cid", "CID for the payload within the piece (CAR CID)",
    "contents": [
        {
            "type": "file | directory",
            "name": "file / directory name",
            "cid": "node CID for the file / directory",
            "content_type": "optional mime type if file",
            "contents": []
        }
    ]
}
```

## Version History

### [v0.1.0] Initial pre-release

Basic shape of super and sub manifests defined.
