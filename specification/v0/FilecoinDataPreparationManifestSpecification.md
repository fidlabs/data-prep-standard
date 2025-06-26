# Filecoin Data Preparation Manifest Specification v0

## Introduction

This specification defines an extensible and interoperable format for content manifests for datasets stored on Filecoin.

### Versioning

Data Preparation Manifest Specification versions follow [SemVer 2.0.0](https://semver.org/)

## Super-manifest

A super-manifest describes a complete dataset which may be stored as several pieces (due to storage segment size constraints) and is a JSON document with the following content:

| Property key    | Data type | Validation  | Description |
| ----            | ----      | ----        | ----        |
| @spec           | String    | required, utf-8, URL, max-len 256    | URL for version of the manifest specification used for this manifest. |
| @spec_version   | String    | required, utf-8, [SemVer 2.0.0](https://semver.org/), max-len 32  | Version number of the specification used for this manifest. |
| name            | String    | required, utf-8, max-len 128         | Name of the dataset. |
| description     | String    | required, utf-8, max-len 4096.       | Description of the dataset. |
| license         | String    | required, utf-8, [SPDX-License-Identifier](https://spdx.org/licenses/), max-len 64. | License(s) the dataset is distributed under. |
| url             | String    | required, utf-8, [URL](https://datatracker.ietf.org/doc/html/rfc1738), max-len 2048  | Dataset project URL. |
| uuid            | String    | required, utf-8, [UUID v4](https://datatracker.ietf.org/doc/html/rfc4122). | Tooling assigned unique ID for this preparation of the dataset. |
| n_pieces        | Number    | required, positive integer  | Number of pieces making up the complete dataset. |
| tags            | Array(String) | optional, array max-len 32, string utf-8, max-len 64  | User supplied tags for the dataset. |
| pieces          | Array(Piece) | required  | Definition of all the pieces that make up the dataset. |

A Piece has the following content:

| Property key    | Data type | Validation  | Description |
| ----            | ----      | ----        | ----        |
| piece_cid       | String    | required, utf-8, [CID v1](https://docs.ipfs.tech/concepts/content-addressing/#version-1-v1)  | Content Identifier for the piece (as in the Filecoin deal). |
| payload_cid     | String    | required, utf-8, [CID v1](https://docs.ipfs.tech/concepts/content-addressing/#version-1-v1)  | Content Identifier for the payload (CAR) in the piece. |
| contents        | Array(Entry) | optional  | Definition of the files and directories in the piece.  |

An Entry has the following content:

| Property key | Data type | Validation  | Description |
| ----         | ----      | ----        | ----        |
| type         | String    | required, utf-8, "file" \| "directory"  | Type of Entry. |
| name         | String    | required, utf-8, max-len 255 | name of file / directory. |
| cid          | String    | required, utf-8, [CID v1](https://docs.ipfs.tech/concepts/content-addressing/#version-1-v1)  | Content Identifier for the file / directory. |

An Entry of type "file" has the following addition content:
| Property key | Data type | Validation  | Description |
| ----         | ----      | ----        | ----        |
| byte_length  | Number    | required, whole number | size of the file in bytes. |
| media_type   | String    | optional, [media (MIME) type](https://datatracker.ietf.org/doc/html/rfc6838) | file content's [registered media type](https://www.iana.org/assignments/media-types/media-types.xhtml) label. |

An Entry of type "directory" has the following addition content:
| Property key | Data type | Validation  | Description |
| ----         | ----      | ----        | ----        |
| contents     | Array(Entry) | required  | Definition of the files and directories in the directory.  |

Informative example:
```
{
    "@spec": "https://raw.githubusercontent.com/fidlabs/data-prep-standard/refs/heads/main/specification/v0/FilecoinDataPreparationManifestSpecification.md",
    "@spec_version": "0.1.0",
    "name": "Dogs",
    "description": "Pictures of dogs",
    "license": "Apache-2.0 or MIT",
    "url": "https://dog.ceo/dog-api/",
    "uuid": "7DD30437-56C9-487B-8DF6-62C7DA251EF1",
    "n_pieces": 4,
    "tags": ["dogs", "cute", "not cats"],
    "pieces": [
        "piece_cid": "ppppppppppp",
        "payload_cid", "bafybeicyw4jiuddx3y4dqbvtzama4lalapsnb5ipy32jdgfvndl6k7bvwm",
        "contents": [
            {
                "type": "directory",
                "name": "dogs",
                "cid": "bafybeidx2lvrc2bu4h3lpx2ld27xli25hruib6udsgwrwmverpemftxxei",
                "contents": [
                    {
                        "type": "file",
                        "name": "rover.jpeg",
                        "cid": "bafkreiflb6kpfyupgm42tfq55ag3sr3qv3nqiw625jdriyx6wr5ewynppe",
                        "byte_length": 17376,
                        "media_type": "image/jpeg",
                    }
                ]
            }
        ]
    ]
}
```

## Sub-manifest

[!TODO]
Table and example format as above

[!TODO]
Highlight that this is a submianifest

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
    "contents": [
        {
            "node_type": "file | directory",
            "name": "file / directory name",
            "cid": "node CID for the file / directory",
            "byte_length": 234,
            "media_type": "optional content-type if file",
            "contents": []
        }
    ]
}
```

## Version History

### [v0.1.0] Initial pre-release

Basic shape of super and sub manifests defined.
