import { describe, expect, test } from "@jest/globals";
import { CID } from "multiformats";

import { Manifest, SubManifest } from "./manifest.js";

const { PieceVerifier } = await import("./verify.js");

describe("piece verifier", () => {
  let manifest: Manifest;
  let subManifest: SubManifest;

  beforeAll(() => {
    manifest = new Manifest(
      {
        name: "Test Manifest",
        description: "This is a test manifest",
        version: "1.0.0",
        license: "MIT",
        project_url: "https://example.com",
        open_with: "test-app",
      },
      "0.1.0"
    );

    subManifest = manifest.newSubManifest();
    subManifest.contents = [
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
    ];

    manifest.addPiece(
      subManifest,
      CID.parse("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"),
      CID.parse("bafkreifdv72xnekom4eslppkyvcaazmcs5llvm7kzhx7po45iuqprjiv6u")
    );
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
