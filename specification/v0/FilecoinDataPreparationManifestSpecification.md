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
| version         | String    | required, utf-8, max-len 64          | Version of the dataset, typically this should be a date.  |
| open_with       | String    | required, utf-8, max-len 256         | Guidance on what tool is needed to use the dataset.  |
| license         | String    | required, utf-8, [SPDX-License-Identifier](https://spdx.org/licenses/), max-len 64  | License(s) the dataset is distributed under. |
| project_url             | String    | required, utf-8, [URL](https://datatracker.ietf.org/doc/html/rfc1738), max-len 2048  | Website for the project that created the dataset. |
| uuid            | String    | required, utf-8, [UUID v4](https://datatracker.ietf.org/doc/html/rfc4122)  | Tooling assigned unique ID for this preparation of the dataset. |
| n_pieces        | Number    | required, positive integer  | Number of pieces making up the complete dataset. |
| tags            | Array(String) | optional, array max-len 32, string utf-8, max-len 64  | User supplied tags for the dataset. |
| pieces          | Array([Piece](#piece)) | required  | List of all the pieces that make up the dataset.  |
| contents        | Array([SuperEntry](#superentry)) | optional  | List of the files and directories in the dataset.  |

A <a href="#piece"></a>Piece has the following content:

| Property key    | Data type | Validation  | Description |
| ----            | ----      | ----        | ----        |
| piece_cid       | String    | required, utf-8, [CID v1](https://docs.ipfs.tech/concepts/content-addressing/#version-1-v1)  | Content Identifier for the piece (as in the Filecoin deal). |
| payload_cid     | String    | required, utf-8, [CID v1](https://docs.ipfs.tech/concepts/content-addressing/#version-1-v1)  | Content Identifier for the payload (CAR) in the piece. |

An <a href="#superentry"></a>SuperEntry has the following base content:

| Property key | Data type | Validation  | Description |
| ----         | ----      | ----        | ----        |
| @type        | String        | required, utf-8, "[file](#superfile)" \| "[split-file](#splitfile)" \| "[directory](#directory)"  | Type of Entry. |
| name         | String        | required, utf-8, max-len 255 | name of file / directory. |

<a href="#superfile"></a>A SuperEntry of type "file" has the following addition content:
| Property key | Data type | Validation  | Description |
| ----         | ----      | ----        | ----        |
| byte_length  | Number    | required, whole number | size of the file in bytes. |
| cid          | String    | required, utf-8, [CID v1](https://docs.ipfs.tech/concepts/content-addressing/#version-1-v1)  | Content Identifier for the file / directory. |
| hash         | String    | required, utf-8, SHA256 hash  | Cryptographic hash of the original file on disk, used for verifying unpacked datasets.  |
| media_type   | String    | optional, utf-8, [media (MIME) type](https://datatracker.ietf.org/doc/html/rfc6838) | file content's [registered media type](https://www.iana.org/assignments/media-types/media-types.xhtml) label. |
| piece_cid   | String | required, utf-8, [CID v1](https://docs.ipfs.tech/concepts/content-addressing/#version-1-v1)  | Content Identifier for the piece that contains the file (as in the Filecoin deal). |

<a href="#splitfile"></a>A SuperEntry of type "split-file" describes a large file that is split over more than one piece, it has the following addition content:
| Property key | Data type | Validation  | Description |
| ----         | ----      | ----        | ----        |
| byte_length  | Number    | required, whole number | size of the file part in bytes. |
| hash         | String    | required, utf-8, SHA256 hash  | Cryptographic hash of the original file on disk.  |
| media_type   | String    | optional, utf-8, [media (MIME) type](https://datatracker.ietf.org/doc/html/rfc6838)  | file content's [registered media type](https://www.iana.org/assignments/media-types/media-types.xhtml) label. |
| parts        | Array([SuperPart](#superpart)) | required  | List of all the parts of the split file.  |

A <a href="#superpart"></a>SuperPart has the following content:
| Property key | Data type | Validation  | Description |
| ----         | ----      | ----        | ----        |
| name         | String    | required, utf-8, max-len 255 | name of file part.  |
| byte_length  | Number    | required, whole number | size of the file part in bytes. |
| cid          | String    | required, utf-8, [CID v1](https://docs.ipfs.tech/concepts/content-addressing/#version-1-v1)  | Content Identifier for the file / directory. |
| piece_cid   | String | required, utf-8, [CID v1](https://docs.ipfs.tech/concepts/content-addressing/#version-1-v1)  | Content Identifier for the piece that contains this part of the file (as in the Filecoin deal). |


## Sub-manifest

A sub-manifest shall be provided inside each CAR (piece) which describes the content of the CAR with links back to the dataset which may comprise many CARs.  The sub-manifest is a JSON document with the following content:

| Property key    | Data type | Validation  | Description |
| ----            | ----      | ----        | ----        |
| @spec           | String    | required, utf-8, URL, max-len 256    | URL for version of the manifest specification used for this manifest. |
| @spec_version   | String    | required, utf-8, [SemVer 2.0.0](https://semver.org/), max-len 32  | Version number of the specification used for this manifest. |
| @type           | String    | required, utf-8 "sub-manifest"       | This is a sub-manifest.  |
| name            | String    | required, utf-8, max-len 128         | Name of the dataset. |
| description     | String    | required, utf-8, max-len 4096        | Description of the dataset. |
| version         | String    | required, utf-8, max-len 64          | Version of the dataset, typically this should be a date.  |
| open_with       | String    | optional, utf-8, max-len 256         | Guidance on what tool is needed to use the dataset.  |
| license         | String    | required, utf-8, [SPDX-License-Identifier](https://spdx.org/licenses/), max-len 64  | License(s) the dataset is distributed under. |
| project_url             | String    | required, utf-8, [URL](https://datatracker.ietf.org/doc/html/rfc1738), max-len 2048  | Website for the project that created the dataset. |
| uuid            | String    | required, utf-8, [UUID v4](https://datatracker.ietf.org/doc/html/rfc4122). | Tooling assigned unique ID for this preparation of the dataset. |
| n_pieces        | Number    | required, positive integer  | Number of pieces making up the complete dataset. |
| tags            | Array(String) | optional, array max-len 32, string utf-8, max-len 64  | User supplied tags for the dataset. |
| contents        | Array([SubEntry](#subentry)) | optional  | List of the files and directories in the CAR.  |

<a href="#subentry"></a>A SubEntry has the following content:

| Property key | Data type | Validation  | Description |
| ----         | ----      | ----        | ----        |
| @type        | String    | required, utf-8, "[file](#subfile)" \| "[part](#subpart)" \| "[directory](#directory)"  | Type of SubEntry. |
| name         | String    | required, utf-8, max-len 255 | name of file / part / directory. |


<a href="#subfile"></a>A SubEntry of type "file" has the following addition content:
| Property key | Data type | Validation  | Description |
| ----         | ----      | ----        | ----        |
| byte_length  | Number    | required, whole number | size of the file in bytes. |
| cid          | String    | required, utf-8, [CID v1](https://docs.ipfs.tech/concepts/content-addressing/#version-1-v1)  | Content Identifier for the file / directory. |
| hash         | String    | required, utf-8, SHA256 hash  | Cryptographic hash of the original file on disk, used for verifying unpacked datasets.  |
| media_type   | String    | optional, utf-8, [media (MIME) type](https://datatracker.ietf.org/doc/html/rfc6838) | file content's [registered media type](https://www.iana.org/assignments/media-types/media-types.xhtml) label. |

<a href="#subpart"></a>A SubEntry of type "part" has the following content:
| Property key | Data type | Validation  | Description |
| ----         | ----      | ----        | ----        |
| byte_length  | Number    | required, whole number | size of the file part in bytes. |
| cid          | String    | required, utf-8, [CID v1](https://docs.ipfs.tech/concepts/content-addressing/#version-1-v1)  | Content Identifier for the file / directory. |
| original-file-name  | String   | required, utf-8, max-len 256  | file name of the original file on disk.  |
| original-file-hash  | String   | required, utf-8, SHA256 hash  | Cryptographic hash of the original file on disk, used as a "back link" to identify the original file in the super-manifest.  |


## Common

<a href="#directory"></a>A SuperEntry or SubEntry of type "directory" has the following addition content:
| Property key | Data type | Validation  | Description |
| ----         | ----      | ----        | ----        |
| contents     | Array(SuperEntry \| SubEntry) | required  | List of the files, parts and directories in the directory.  |


## Examples:

### super-manifest

```
{
    "@spec": "https://raw.githubusercontent.com/fidlabs/data-prep-standard/refs/heads/main/specification/v0/FilecoinDataPreparationManifestSpecification.md",
    "@spec_version": "0.1.0",
    "@type": "super-manifest,
    "name": "Dogs",
    "description": "Pictures of dogs",
    "version": "2025-03-25",
    "open_with": "web browser",
    "license": "Apache-2.0 or MIT",
    "url": "https://dog.ceo/dog-api/",
    "uuid": "7DD30437-56C9-487B-8DF6-62C7DA251EF1",
    "n_pieces": 2,
    "tags": ["dogs", "cute", "not cats"],
    "pieces": [
        {
            "piece_cid": "bafkreiaw7ga7qnz2jazjh5i7ymarpojwlptatlps4rj7w4yqvey3yucb74",
            "payload_cid", "bafkreibczfhzp2gyoimvtxrm6yy6m43eqbaunp2qnuqryt2npzokw4cfki",
        },
        {
            "piece_cid": "bafkreig5chwsxzyow7pc7iiokxibmxvqspubnabjzo65lctoxthvavc35q",
            "payload_cid", "bafkreicvlypxbttltn6oo6wqpoulfnvtuvb3fr6mr7qvulbqvunyszt6ee",
        }
    ],
    "contents": [
        {
            "@type": "directory",
            "name": "dogs",
            "contents": [
                {
                    "type": "@file",
                    "name": "rover.jpeg",
                    "hash": "bdc1d51b183d5ad329fadba55bba6d0988d6180ddd9d606df54dd56a6f43ef42"
                    "cid": "bafkreiflb6kpfyupgm42tfq55ag3sr3qv3nqiw625jdriyx6wr5ewynppe",
                    "byte_length": 17376,
                    "media_type": "image/jpeg",
                    "piece": "bafkreiaw7ga7qnz2jazjh5i7ymarpojwlptatlps4rj7w4yqvey3yucb74"
                },
                {
                    "type": "@split-file",
                    "name": "crufts.mpeg",
                    "hash": "f606d62ef8e97eb527556da69de37f02026167933a617b07be33a570fbdd61a4"
                    "cid": "bafkreiflb6kpfyupgm42tfq55ag3sr3qv3nqiw625jdriyx6wr5ewynppe",
                    "byte_length": 173760000,
                    "media_type": "video/mp4",
                    "parts" [
                        {
                            "name": "crufts.mpeg.part_000",
                            "byte_length": 234533,
                            "cid": "bafkreibgjlm6mrxx4ffghw2z3ozjmxpu7kcvlip5suvmkj7ekpdefeyoky",
                            "piece_cid": "ppppppppppp"
                        },
                        {
                            "name": "crufts.mpeg.part_001",
                            "byte_length": 143243,
                            "cid": "bafkreiefzwqep242uwiplt46jaktsj2u43zdeyt55igf57xp3hvewztrwa",
                            "piece_cid": "bafkreig5chwsxzyow7pc7iiokxibmxvqspubnabjzo65lctoxthvavc35q"
                        },
                    ]
                }
            ]
        },
        {
            "@type": "directory",
            "name": "more dogs",
            "contents": [
                {
                    "@type": "file",
                    "name": "fido.jpeg",
                    "hash": "bdc1d51b183d5ad329fadba55bba6d0988d6180ddd9d606df54dd56a6f43ef42"
                    "cid": "bafkreifqdymdakaospihjaqoh56h2gqv2icxyqkpphr47ixmjgoabtaffy",
                    "byte_length": 17376,
                    "media_type": "image/jpeg",
                    "piece": "bafkreig5chwsxzyow7pc7iiokxibmxvqspubnabjzo65lctoxthvavc35q"
                }
            ]
        }
    ]
}
```

### sub-manifests

Sub manifest in CAR in Piece 1
```
{
    "@spec": "https://raw.githubusercontent.com/fidlabs/data-prep-standard/refs/heads/main/specification/v0/FilecoinDataPreparationManifestSpecification.md",
    "@spec_version": "0.1.0",
    "@type": "sub-manifest,
    "name": "Dogs",
    "description": "Pictures of dogs",
    "version": "2025-03-25",
    "open_with": "web browser",
    "license": "Apache-2.0 or MIT",
    "url": "https://dog.ceo/dog-api/",
    "uuid": "7DD30437-56C9-487B-8DF6-62C7DA251EF1",
    "n_pieces": 2,
    "tags": ["dogs", "cute", "not cats"],
    "contents": [
        {
            "@type": "directory",
            "name": "dogs",
            "contents": [
                {
                    "@type": "file",
                    "name": "rover.jpeg",
                    "cid": "bafkreiflb6kpfyupgm42tfq55ag3sr3qv3nqiw625jdriyx6wr5ewynppe",
                    "byte_length": 17376,
                    "media_type": "image/jpeg",
                },
                {
                    "@type": "file-part",
                    "name": "crufts.mpeg.part_000",
                    "byte_length": 234533,
                    "cid": "bafkreibgjlm6mrxx4ffghw2z3ozjmxpu7kcvlip5suvmkj7ekpdefeyoky",
                    "original-file-name" : "crufts.mpeg",
                    "original-file-hash" : "f606d62ef8e97eb527556da69de37f02026167933a617b07be33a570fbdd61a4"
                },
            ]
        }
    ]
}
```

Sub manifest in CAR in Piece 2
```
{
    "@spec": "https://raw.githubusercontent.com/fidlabs/data-prep-standard/refs/heads/main/specification/v0/FilecoinDataPreparationManifestSpecification.md",
    "@spec_version": "0.1.0",
    "@type": "sub-manifest,
    "name": "Dogs",
    "description": "Pictures of dogs",
    "version": "2025-03-25",
    "open_with": "web browser",
    "license": "Apache-2.0 or MIT",
    "url": "https://dog.ceo/dog-api/",
    "uuid": "7DD30437-56C9-487B-8DF6-62C7DA251EF1",
    "n_pieces": 2,
    "tags": ["dogs", "cute", "not cats"],
    "contents": [
        {
            "@type": "directory",
            "name": "dogs",
            "contents": [
                {
                    "@type": "file-part",
                    "name": "crufts.mpeg.part_001",
                    "byte_length": 143243,
                    "cid": "bafkreiefzwqep242uwiplt46jaktsj2u43zdeyt55igf57xp3hvewztrwa",
                    "original-file-name" : "crufts.mpeg",
                    "original-file-hash" : "f606d62ef8e97eb527556da69de37f02026167933a617b07be33a570fbdd61a4"
                },
            ]
        },
        {
            "@type": "directory",
            "name": "more dogs",
            "contents": [
                {
                    "@type": "file",
                    "name": "fido.jpeg",
                    "hash": "bdc1d51b183d5ad329fadba55bba6d0988d6180ddd9d606df54dd56a6f43ef42"
                    "cid": "bafkreifqdymdakaospihjaqoh56h2gqv2icxyqkpphr47ixmjgoabtaffy",
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
