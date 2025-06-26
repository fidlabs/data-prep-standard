# Filecoin Data Preparation Manifest Specification v0

## Introduction

This specification defines an extensible and interoperable format for content manifests for datasets stored on Filecoin.

### Versioning

Data Preparation Manifest Specification versions follow [SemVer 2.0.0](https://semver.org/)

## Super-manifest

A super-manifest describes a complete and coherent dataset which may be stored as several pieces (due to storage segment size constraints) and is a JSON document with the following content:

| Property key    | Data type | Validation  | Description |
| ----            | ----      | ----        | ----        |
| @spec           | String    | required, utf-8, [URL](https://datatracker.ietf.org/doc/html/rfc1738), max-len 256    | URL for version of the manifest specification used for this manifest. |
| @spec_version   | String    | required, utf-8, [SemVer 2.0.0](https://semver.org/), max-len 32  | Version number of the specification used for this manifest. |
| @type           | String    | required, utf-8 "super-manifest"     | This is a super-manifest.  |
| name            | String    | required, utf-8, max-len 128         | Name of the dataset. |
| description     | String    | required, utf-8, max-len 4096        | Description of the dataset. |
| open_with       | String    | optional, utf-8, max-len 256         | Guidance on what tool is needed to use the dataset.  |
| license         | String    | required, utf-8, [SPDX-License-Identifier](https://spdx.org/licenses/), max-len 64  | License(s) the dataset is distributed under. |
| url             | String    | required, utf-8, [URL](https://datatracker.ietf.org/doc/html/rfc1738), max-len 2048  | Website for the project that created the dataset. |
| uuid            | String    | required, utf-8, [UUID v4](https://datatracker.ietf.org/doc/html/rfc4122)  | Tooling assigned unique ID for this preparation of the dataset. |
| n_pieces        | Number    | required, positive integer  | Number of pieces making up the complete dataset. |
| tags            | Array(String) | optional, array max-len 32, string utf-8, max-len 64  | User supplied tags for the dataset. |
| pieces          | Array([Piece](#piece)) | required  | List of all the pieces that make up the dataset. |

A <a href="#piece"></a>Piece has the following content:

| Property key    | Data type | Validation  | Description |
| ----            | ----      | ----        | ----        |
| piece_cid       | String    | required, utf-8, [CID v1](https://docs.ipfs.tech/concepts/content-addressing/#version-1-v1)  | Content Identifier for the piece (as in the Filecoin deal). |
| payload_cid     | String    | required, utf-8, [CID v1](https://docs.ipfs.tech/concepts/content-addressing/#version-1-v1)  | Content Identifier for the payload (CAR) in the piece. |
| contents        | Array([Entry](#entry)) | optional  | List of the files and directories in the piece.  |

## Sub-manifest

A sub-manifest shall be provided inside each CAR (piece) which describes the content of the CAR with links back to the dataset which may comprise many CARs.  The sub-manifest is a JSON document with the following content:

| Property key    | Data type | Validation  | Description |
| ----            | ----      | ----        | ----        |
| @spec           | String    | required, utf-8, URL, max-len 256    | URL for version of the manifest specification used for this manifest. |
| @spec_version   | String    | required, utf-8, [SemVer 2.0.0](https://semver.org/), max-len 32  | Version number of the specification used for this manifest. |
| @type           | String    | required, utf-8 "sub-manifest"       | This is a sub-manifest.  |
| name            | String    | required, utf-8, max-len 128         | Name of the dataset. |
| description     | String    | required, utf-8, max-len 4096        | Description of the dataset. |
| open_with       | String    | optional, utf-8, max-len 256         | Guidance on what tool is needed to use the dataset.  |
| license         | String    | required, utf-8, [SPDX-License-Identifier](https://spdx.org/licenses/), max-len 64  | License(s) the dataset is distributed under. |
| url             | String    | required, utf-8, [URL](https://datatracker.ietf.org/doc/html/rfc1738), max-len 2048  | Website for the project that created the dataset. |
| uuid            | String    | required, utf-8, [UUID v4](https://datatracker.ietf.org/doc/html/rfc4122). | Tooling assigned unique ID for this preparation of the dataset. |
| n_pieces        | Number    | required, positive integer  | Number of pieces making up the complete dataset. |
| tags            | Array(String) | optional, array max-len 32, string utf-8, max-len 64  | User supplied tags for the dataset. |
| contents        | Array([Entry](#entry)) | optional  | List of the files and directories in the CAR.  |

## Common

An <a href="#entry"></a>Entry has the following content:

| Property key | Data type | Validation  | Description |
| ----         | ----      | ----        | ----        |
| type         | String    | required, utf-8, "file" \| "directory"  | Type of Entry. |
| name         | String    | required, utf-8, max-len 255 | name of file / directory. |
| cid          | String    | required, utf-8, [CID v1](https://docs.ipfs.tech/concepts/content-addressing/#version-1-v1)  | Content Identifier for the file / directory. |

An Entry of type "file" has the following addition content:
| Property key | Data type | Validation  | Description |
| ----         | ----      | ----        | ----        |
| byte_length  | Number    | required, whole number | size of the file in bytes. |
| media_type   | String    | optional, utf-8, [media (MIME) type](https://datatracker.ietf.org/doc/html/rfc6838) | file content's [registered media type](https://www.iana.org/assignments/media-types/media-types.xhtml) label. |

An Entry of type "directory" has the following addition content:
| Property key | Data type | Validation  | Description |
| ----         | ----      | ----        | ----        |
| contents     | Array(Entry) | required  | List of the files and directories in the directory.  |


## Examples:

### super-manifest

```
{
    "@spec": "https://raw.githubusercontent.com/fidlabs/data-prep-standard/refs/heads/main/specification/v0/FilecoinDataPreparationManifestSpecification.md",
    "@spec_version": "0.1.0",
    "@type": "super-manifest,
    "name": "Dogs",
    "description": "Pictures of dogs",
    "open_with": "web browser",
    "license": "Apache-2.0 or MIT",
    "url": "https://dog.ceo/dog-api/",
    "uuid": "7DD30437-56C9-487B-8DF6-62C7DA251EF1",
    "n_pieces": 2,
    "tags": ["dogs", "cute", "not cats"],
    "pieces": [
        "piece_cid": "ppppppppppp",
        "payload_cid", "bafkreibczfhzp2gyoimvtxrm6yy6m43eqbaunp2qnuqryt2npzokw4cfki",
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
        ],
        "piece_cid": "bafkreig5chwsxzyow7pc7iiokxibmxvqspubnabjzo65lctoxthvavc35q",
        "payload_cid", "bafkreicvlypxbttltn6oo6wqpoulfnvtuvb3fr6mr7qvulbqvunyszt6ee",
        "contents": [
            {
                "type": "directory",
                "name": "more dogs",
                "cid": "bafybeiaxsepx7ceboxhiohtb56oynetqe7amqegqhdzcml7l3yedmmmq7u",
                "contents": [
                    {
                        "type": "file",
                        "name": "fido.jpeg",
                        "cid": "bafkreifqdymdakaospihjaqoh56h2gqv2icxyqkpphr47ixmjgoabtaffy",
                        "byte_length": 17376,
                        "media_type": "image/jpeg",
                    }
                ]
            }
        ]
    ]
}
```

### sub-manifest
```
{
    "@spec": "https://raw.githubusercontent.com/fidlabs/data-prep-standard/refs/heads/main/specification/v0/FilecoinDataPreparationManifestSpecification.md",
    "@spec_version": "0.1.0",
    "@type": "sub-manifest,
    "name": "Dogs",
    "description": "Pictures of dogs",
    "open_with": "web browser",
    "license": "Apache-2.0 or MIT",
    "url": "https://dog.ceo/dog-api/",
    "uuid": "7DD30437-56C9-487B-8DF6-62C7DA251EF1",
    "n_pieces": 2,
    "tags": ["dogs", "cute", "not cats"],
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
}
```


## Version History

### [v0.1.0] Initial pre-release

Basic shape of super and sub manifests defined.
