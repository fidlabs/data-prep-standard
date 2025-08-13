import { describe, expect, test } from "@jest/globals";
import { CID } from "multiformats";

import { SubManifest, SuperManifest } from "./manifest.js";
import { VerificationSplitFile } from "./verifier.js";

const { Verifier } = await import("./verifier.js");

describe("piece verifier", () => {
  let manifest: SuperManifest;
  let subManifest: SubManifest;

  beforeAll(() => {
    manifest = {
      "@spec": "spec link",
      "@spec_version": "0.1.0",
      name: "Test Manifest",
      description: "This is a test manifest",
      version: "1.0.0",
      license: "MIT",
      project_url: "https://example.com",
      open_with: "test-app",
      uuid: "33A62D5C-F2F3-4305-929F-D981D0FA1BE1",
      n_pieces: 1,
      pieces: [
        {
          payload_cid:
            "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          piece_cid:
            "bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u",
        },
      ],
      contents: [
        {
          "@type": "directory",
          name: "test-dir",
          contents: [
            {
              "@type": "file",
              name: "file1.txt",
              cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
              hash: "1234567890abcdef",
              byte_length: 1234,
              piece_cid:
                "bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u",
            },
          ],
        },
      ],
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { contents, pieces, n_pieces, ...rest } = manifest;

    subManifest = {
      ...rest,
      contents: [
        {
          "@type": "directory",
          name: "test-dir",
          contents: [
            {
              "@type": "file",
              name: "file1.txt",
              cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
              hash: "1234567890abcdef",
              byte_length: 1234,
            },
          ],
        },
      ],
    };
  });

  test("simple happy day", () => {
    const verifier = new Verifier();
    const pieceVerifier = verifier.newPieceVerifier(
      "path/to/carFile.car",
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });

    expect(() => pieceVerifier.verify(subManifest)).not.toThrow();
  });

  test("missing file", () => {
    const verifier = new Verifier();
    const pieceVerifier = verifier.newPieceVerifier(
      "path/to/carFile.car",
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    pieceVerifier.addDirectory("test-dir");

    expect(() => pieceVerifier.verify(subManifest)).toThrow();
  });

  test("extra file", () => {
    const verifier = new Verifier();
    const pieceVerifier = verifier.newPieceVerifier(
      "path/to/carFile.car",
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });
    pieceVerifier.addFile("test-dir/file2.txt", {
      hash: "abcdef1234567890",
      cid: "bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u",
      byteLength: 5678,
    });

    expect(() => pieceVerifier.verify(subManifest)).toThrow();
  });

  test("missing dir", () => {
    const verifier = new Verifier();
    const pieceVerifier = verifier.newPieceVerifier(
      "path/to/carFile.car",
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });

    expect(() => pieceVerifier.verify(subManifest)).toThrow();
  });

  test("extra dir", () => {
    const verifier = new Verifier();
    const pieceVerifier = verifier.newPieceVerifier(
      "path/to/carFile.car",
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });
    pieceVerifier.addDirectory("test-dir2");

    expect(() => pieceVerifier.verify(subManifest)).toThrow();
  });

  test("bad hash", () => {
    const verifier = new Verifier();
    const pieceVerifier = verifier.newPieceVerifier(
      "path/to/carFile.car",
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "0000001",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });

    expect(() => pieceVerifier.verify(subManifest)).toThrow();
  });

  test("wrong file CID", () => {
    const verifier = new Verifier();
    const pieceVerifier = verifier.newPieceVerifier(
      "path/to/carFile.car",
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafkreihfuafktgi2zcs64mijqrgyjjkvqo6savzk2p742qtzf46dnmmdvu",
      byteLength: 1234,
    });

    expect(() => pieceVerifier.verify(subManifest)).toThrow();
  });

  test("wrong byte length", () => {
    const verifier = new Verifier();
    const pieceVerifier = verifier.newPieceVerifier(
      "path/to/carFile.car",
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 5678,
    });

    expect(() => pieceVerifier.verify(subManifest)).toThrow();
  });
});

describe("super manifest verifier", () => {
  let manifest: SuperManifest;
  let subManifest: SubManifest;

  beforeAll(() => {
    manifest = {
      "@spec": "spec link",
      "@spec_version": "0.1.0",
      name: "Test Manifest",
      description: "This is a test manifest",
      version: "1.0.0",
      license: "MIT",
      project_url: "https://example.com",
      open_with: "test-app",
      uuid: "33A62D5C-F2F3-4305-929F-D981D0FA1BE1",
      n_pieces: 1,
      pieces: [
        {
          payload_cid:
            "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          piece_cid:
            "bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u",
        },
      ],
      contents: [
        {
          "@type": "directory",
          name: "test-dir",
          contents: [
            {
              "@type": "file",
              name: "file1.txt",
              cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
              hash: "1234567890abcdef",
              byte_length: 1234,
              piece_cid:
                "bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u",
            },
          ],
        },
      ],
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { contents, pieces, n_pieces, ...rest } = manifest;

    subManifest = {
      ...rest,
      contents: [
        {
          "@type": "directory",
          name: "test-dir",
          contents: [
            {
              "@type": "file",
              name: "file1.txt",
              cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
              hash: "1234567890abcdef",
              byte_length: 1234,
            },
          ],
        },
      ],
    };
  });

  test("simple happy day", () => {
    const verifier = new Verifier(manifest);
    const pieceVerifier = verifier.newPieceVerifier(
      "path/to/carFile.car",
      CID.parse("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });

    expect(() => {
      pieceVerifier.verify(subManifest);
    }).not.toThrow();
  });

  test("different spec_version", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { contents, pieces, n_pieces, ...rest } = manifest;

    const badSubManifest: SubManifest = {
      ...rest,
      "@spec_version": "9.99.9",
      contents: [
        {
          "@type": "directory",
          name: "test-dir",
          contents: [
            {
              "@type": "file",
              name: "file1.txt",
              cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
              hash: "1234567890abcdef",
              byte_length: 1234,
            },
          ],
        },
      ],
    };
    const verifier = new Verifier(manifest);
    const badPieceVerifier = verifier.newPieceVerifier(
      "path/to/carFile.car",
      CID.parse("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    badPieceVerifier.addDirectory("test-dir");
    badPieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });

    expect(() => {
      badPieceVerifier.verify(badSubManifest);
    }).toThrow();
  });

  test("non existant piece CID", () => {
    const verifier = new Verifier(manifest);

    expect(() => {
      verifier.newPieceVerifier(
        "path/to/carFile.car",
        CID.parse(
          "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
        ),
        CID.parse("bafkreiec6l7reufq36dxvbapvt6f6mivveqpqqueuknre65ylo2gqadfpa")
      );
    }).toThrow();
  });

  test("repeat piece CID", () => {
    const verifier = new Verifier(manifest);
    const pieceVerifier = verifier.newPieceVerifier(
      "path/to/carFile.car",
      CID.parse("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });
    pieceVerifier.verify(subManifest);

    expect(() => {
      verifier.newPieceVerifier(
        "path/to/differente/carFile.car",
        CID.parse(
          "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
        ),
        CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
      );
    }).not.toThrow();
  });

  test("not enough pieces", () => {
    const twoPieceManifest = {
      "@spec": "spec link",
      "@spec_version": "0.1.0",
      name: "Test Manifest",
      description: "This is a test manifest",
      version: "1.0.0",
      license: "MIT",
      project_url: "https://example.com",
      open_with: "test-app",
      uuid: "33A62D5C-F2F3-4305-929F-D981D0FA1BE1",
      n_pieces: 2,
      pieces: [
        {
          payload_cid:
            "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          piece_cid:
            "bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u",
        },
        {
          payload_cid:
            "bafybeicavh5ivvh6iuwaos53ijftaijdoyluhoj7t5n5zo2p6gn5gfown4",
          piece_cid:
            "bafkreic7oc7rriegabybn2kiwbfo2o4cca5dnpvec5k3nto7v4ikzy6g54",
        },
      ],
    };
    const verifier = new Verifier(twoPieceManifest);
    const pieceVerifier = verifier.newPieceVerifier(
      "path/to/carFile.car",
      CID.parse("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });
    pieceVerifier.verify(subManifest);

    expect(() => {
      verifier.verifyPieces(new Map<string, VerificationSplitFile>());
    }).toThrow();
  });

  test("split file happy day", () => {
    const manifest: SuperManifest = {
      "@spec": "spec link",
      "@spec_version": "0.1.0",
      name: "Test Manifest",
      description: "This is a test manifest",
      version: "1.0.0",
      license: "MIT",
      project_url: "https://example.com",
      open_with: "test-app",
      uuid: "33A62D5C-F2F3-4305-929F-D981D0FA1BE1",
      n_pieces: 2,
      pieces: [
        {
          payload_cid:
            "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          piece_cid:
            "bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u",
        },
        {
          payload_cid:
            "bafybeicavh5ivvh6iuwaos53ijftaijdoyluhoj7t5n5zo2p6gn5gfown4",
          piece_cid:
            "bafkreic7oc7rriegabybn2kiwbfo2o4cca5dnpvec5k3nto7v4ikzy6g54",
        },
      ],
      contents: [
        {
          "@type": "directory",
          name: "test-dir",
          contents: [
            {
              "@type": "split-file",
              name: "file1.txt",
              hash: "12345abcdef67890",
              byte_length: 5678,
              parts: [
                {
                  name: "file1.txt.part.0",
                  cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
                  byte_length: 1234,
                  piece_cid:
                    "bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u",
                },
                {
                  name: "file1.txt.part.1",
                  cid: "bafkreihfuafktgi2zcs64mijqrgyjjkvqo6savzk2p742qtzf46dnmmdvu",
                  byte_length: 4444,
                  piece_cid:
                    "bafkreic7oc7rriegabybn2kiwbfo2o4cca5dnpvec5k3nto7v4ikzy6g54",
                },
              ],
            },
          ],
        },
      ],
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { contents, pieces, n_pieces, ...rest } = manifest;

    const subManifest1: SubManifest = {
      ...rest,
      contents: [
        {
          "@type": "directory",
          name: "test-dir",
          contents: [
            {
              "@type": "file-part",
              name: "file1.txt.part.0",
              byte_length: 1234,
              cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
              original_file_byte_length: 5678,
              original_file_hash: "12345abcdef67890",
              original_file_name: "file1.txt",
            },
          ],
        },
      ],
    };

    const subManifest2: SubManifest = {
      ...rest,
      contents: [
        {
          "@type": "directory",
          name: "test-dir",
          contents: [
            {
              "@type": "file-part",
              name: "file1.txt.part.1",
              byte_length: 4444,
              cid: "bafkreihfuafktgi2zcs64mijqrgyjjkvqo6savzk2p742qtzf46dnmmdvu",
              original_file_byte_length: 5678,
              original_file_hash: "12345abcdef67890",
              original_file_name: "file1.txt",
            },
          ],
        },
      ],
    };

    const verifier = new Verifier(manifest);

    const piece1Verifier = verifier.newPieceVerifier(
      "path/to/carFile.car",
      CID.parse("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    piece1Verifier.addDirectory("test-dir");
    piece1Verifier.addFile("test-dir/file1.txt.part.0", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });

    expect(() => {
      piece1Verifier.verify(subManifest1);
    }).not.toThrow();

    const piece2Verifier = verifier.newPieceVerifier(
      "path/to/another/carFile.car",
      CID.parse("bafybeicavh5ivvh6iuwaos53ijftaijdoyluhoj7t5n5zo2p6gn5gfown4"),
      CID.parse("bafkreic7oc7rriegabybn2kiwbfo2o4cca5dnpvec5k3nto7v4ikzy6g54")
    );
    piece2Verifier.addDirectory("test-dir");
    piece2Verifier.addFile("test-dir/file1.txt.part.1", {
      hash: "abcdef1234567890",
      cid: "bafkreihfuafktgi2zcs64mijqrgyjjkvqo6savzk2p742qtzf46dnmmdvu",
      byteLength: 4444,
    });

    expect(() => {
      piece2Verifier.verify(subManifest2);
    }).not.toThrow();

    const joinedFiles = new Map<string, VerificationSplitFile>();
    joinedFiles.set("test-dir/file1.txt", {
      hash: "12345abcdef67890",
      byteLength: 5678,
    });

    expect(() => {
      verifier.verifyPieces(joinedFiles);
    }).not.toThrow();
  });

  test("split file bad hash", () => {
    const manifest: SuperManifest = {
      "@spec": "spec link",
      "@spec_version": "0.1.0",
      name: "Test Manifest",
      description: "This is a test manifest",
      version: "1.0.0",
      license: "MIT",
      project_url: "https://example.com",
      open_with: "test-app",
      uuid: "33A62D5C-F2F3-4305-929F-D981D0FA1BE1",
      n_pieces: 2,
      pieces: [
        {
          payload_cid:
            "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          piece_cid:
            "bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u",
        },
        {
          payload_cid:
            "bafybeicavh5ivvh6iuwaos53ijftaijdoyluhoj7t5n5zo2p6gn5gfown4",
          piece_cid:
            "bafkreic7oc7rriegabybn2kiwbfo2o4cca5dnpvec5k3nto7v4ikzy6g54",
        },
      ],
      contents: [
        {
          "@type": "directory",
          name: "test-dir",
          contents: [
            {
              "@type": "split-file",
              name: "file1.txt",
              hash: "12345abcdef67890",
              byte_length: 5678,
              parts: [
                {
                  name: "file1.txt.part.0",
                  cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
                  byte_length: 1234,
                  piece_cid:
                    "bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u",
                },
                {
                  name: "file1.txt.part.1",
                  cid: "bafkreihfuafktgi2zcs64mijqrgyjjkvqo6savzk2p742qtzf46dnmmdvu",
                  byte_length: 4444,
                  piece_cid:
                    "bafkreic7oc7rriegabybn2kiwbfo2o4cca5dnpvec5k3nto7v4ikzy6g54",
                },
              ],
            },
          ],
        },
      ],
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { contents, pieces, n_pieces, ...rest } = manifest;

    const subManifest1: SubManifest = {
      ...rest,
      contents: [
        {
          "@type": "directory",
          name: "test-dir",
          contents: [
            {
              "@type": "file-part",
              name: "file1.txt.part.0",
              byte_length: 1234,
              cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
              original_file_byte_length: 5678,
              original_file_hash: "12345abcdef67890",
              original_file_name: "file1.txt",
            },
          ],
        },
      ],
    };

    const subManifest2: SubManifest = {
      ...rest,
      contents: [
        {
          "@type": "directory",
          name: "test-dir",
          contents: [
            {
              "@type": "file-part",
              name: "file1.txt.part.1",
              byte_length: 4444,
              cid: "bafkreihfuafktgi2zcs64mijqrgyjjkvqo6savzk2p742qtzf46dnmmdvu",
              original_file_byte_length: 5678,
              original_file_hash: "12345abcdef67890",
              original_file_name: "file1.txt",
            },
          ],
        },
      ],
    };

    const verifier = new Verifier(manifest);

    const piece1Verifier = verifier.newPieceVerifier(
      "path/to/carFile.car",
      CID.parse("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    piece1Verifier.addDirectory("test-dir");
    piece1Verifier.addFile("test-dir/file1.txt.part.0", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });

    expect(() => {
      piece1Verifier.verify(subManifest1);
    }).not.toThrow();

    const piece2Verifier = verifier.newPieceVerifier(
      "path/to/another/carFile.car",
      CID.parse("bafybeicavh5ivvh6iuwaos53ijftaijdoyluhoj7t5n5zo2p6gn5gfown4"),
      CID.parse("bafkreic7oc7rriegabybn2kiwbfo2o4cca5dnpvec5k3nto7v4ikzy6g54")
    );
    piece2Verifier.addDirectory("test-dir");
    piece2Verifier.addFile("test-dir/file1.txt.part.1", {
      hash: "abcdef1234567890",
      cid: "bafkreihfuafktgi2zcs64mijqrgyjjkvqo6savzk2p742qtzf46dnmmdvu",
      byteLength: 4444,
    });

    expect(() => {
      piece2Verifier.verify(subManifest2);
    }).not.toThrow();

    const joinedFiles = new Map<string, VerificationSplitFile>();
    joinedFiles.set("test-dir/file1.txt", {
      hash: "1234123412341234",
      byteLength: 5678,
    });

    expect(() => {
      verifier.verifyPieces(joinedFiles);
    }).toThrow();
  });
});
