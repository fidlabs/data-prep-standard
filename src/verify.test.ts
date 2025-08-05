import { describe, expect, test } from "@jest/globals";
import { CID } from "multiformats";

import { SubManifest, SuperManifest } from "./manifest.js";
import { PieceVerifier, Verifier } from "./verify.js";

const { PieceVerifier } = await import("./verify.js");

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
    const pieceVerifier = new PieceVerifier("path/to/carFile.car");
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });

    expect(() =>
      pieceVerifier.verify(
        subManifest,
        CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
      )
    ).not.toThrow();
  });

  test("missing file", () => {
    const pieceVerifier = new PieceVerifier("path/to/carFile.car");
    pieceVerifier.addDirectory("test-dir");

    expect(() =>
      pieceVerifier.verify(
        subManifest,
        CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
      )
    ).toThrow();
  });

  test("extra file", () => {
    const pieceVerifier = new PieceVerifier("path/to/carFile.car");
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

    expect(() =>
      pieceVerifier.verify(
        subManifest,
        CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
      )
    ).toThrow();
  });

  test("missing dir", () => {
    const pieceVerifier = new PieceVerifier("path/to/carFile.car");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });

    expect(() =>
      pieceVerifier.verify(
        subManifest,
        CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
      )
    ).toThrow();
  });

  test("extra dir", () => {
    const pieceVerifier = new PieceVerifier("path/to/carFile.car");
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });
    pieceVerifier.addDirectory("test-dir2");

    expect(() =>
      pieceVerifier.verify(
        subManifest,
        CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
      )
    ).toThrow();
  });

  test("bad hash", () => {
    const pieceVerifier = new PieceVerifier("path/to/carFile.car");
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "0000001",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });

    expect(() =>
      pieceVerifier.verify(
        subManifest,
        CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
      )
    ).toThrow();
  });

  test("wrong file CID", () => {
    const pieceVerifier = new PieceVerifier("path/to/carFile.car");
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafkreihfuafktgi2zcs64mijqrgyjjkvqo6savzk2p742qtzf46dnmmdvu",
      byteLength: 1234,
    });

    expect(() =>
      pieceVerifier.verify(
        subManifest,
        CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
      )
    ).toThrow();
  });

  test("wrong byte length", () => {
    const pieceVerifier = new PieceVerifier("path/to/carFile.car");
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 5678,
    });

    expect(() =>
      pieceVerifier.verify(
        subManifest,
        CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
      )
    ).toThrow();
  });
});

describe("verifier", () => {
  let manifest: SuperManifest;
  let subManifest: SubManifest;
  let pieceVerifier: PieceVerifier;

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

    pieceVerifier = new PieceVerifier("path/to/carFile.car");
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });

    pieceVerifier.verify(
      subManifest,
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
  });

  test("simple happy day", () => {
    const verifier = new Verifier(manifest);

    expect(() => {
      verifier.addPiece(
        pieceVerifier,
        CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
      );
    }).not.toThrow();
  });

  test("different spec_version", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { contents, pieces, n_pieces, ...rest } = manifest;

    subManifest = {
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

    pieceVerifier = new PieceVerifier("path/to/carFile.car");
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });

    pieceVerifier.verify(
      subManifest,
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    const verifier = new Verifier(manifest);

    expect(() => {
      verifier.addPiece(
        pieceVerifier,
        CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
      );
    }).toThrow();
  });

  test("different piece CID", () => {
    const pieceVerifier = new PieceVerifier("path/to/carFile.car");
    pieceVerifier.addDirectory("test-dir");
    pieceVerifier.addFile("test-dir/file1.txt", {
      hash: "1234567890abcdef",
      cid: "bafybeieplyjzhimptinwi5ufo3hlhum7svpq5r3g5f7jhynolvtvn3w77i",
      byteLength: 1234,
    });

    pieceVerifier.verify(
      subManifest,
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
    const verifier = new Verifier(manifest);

    expect(() => {
      verifier.addPiece(
        pieceVerifier,
        CID.parse("bafkreiec6l7reufq36dxvbapvt6f6mivveqpqqueuknre65ylo2gqadfpa")
      );
    }).toThrow();
  });
});
