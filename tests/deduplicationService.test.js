/**
 * Unit tests for deduplication logic in fileService.
 * Tests the SHA-256 hashing and dedup detection behavior.
 */

const crypto = require("crypto");

// --- Utility under test (extracted from fileService for testability) ---

function computeHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function buildUploadResult({ ref, blob, wasDeduplicated, bytesSaved }) {
  return {
    fileReferenceId: ref.id,
    displayName: ref.display_name,
    sizeBytes: blob.size_bytes,
    mimeType: blob.mime_type,
    sha256Hash: blob.sha256_hash,
    wasDeduplicated,
    bytesSaved,
    message: wasDeduplicated
      ? `File deduplicated — saved ${bytesSaved} bytes`
      : "File uploaded successfully",
  };
}

// --- Tests ---

describe("Deduplication Service", () => {
  describe("computeHash()", () => {
    test("produces consistent SHA-256 hash for same input", () => {
      const buffer = Buffer.from("hello world");
      const hash1 = computeHash(buffer);
      const hash2 = computeHash(buffer);
      expect(hash1).toBe(hash2);
    });

    test("produces different hashes for different inputs", () => {
      const hash1 = computeHash(Buffer.from("file-content-1"));
      const hash2 = computeHash(Buffer.from("file-content-2"));
      expect(hash1).not.toBe(hash2);
    });

    test("hash is a 64-character hex string", () => {
      const hash = computeHash(Buffer.from("test"));
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    test("empty buffer produces a valid hash", () => {
      const hash = computeHash(Buffer.from(""));
      expect(hash).toHaveLength(64);
    });
  });

  describe("buildUploadResult()", () => {
    const mockBlob = {
      id: "blob-uuid-123",
      sha256_hash: "abc123",
      size_bytes: 1024,
      mime_type: "image/jpeg",
    };

    const mockRef = {
      id: "ref-uuid-456",
      display_name: "photo.jpg",
    };

    test("returns correct result for new file upload", () => {
      const result = buildUploadResult({
        ref: mockRef,
        blob: mockBlob,
        wasDeduplicated: false,
        bytesSaved: 0,
      });

      expect(result.wasDeduplicated).toBe(false);
      expect(result.bytesSaved).toBe(0);
      expect(result.message).toBe("File uploaded successfully");
      expect(result.fileReferenceId).toBe("ref-uuid-456");
      expect(result.sizeBytes).toBe(1024);
    });

    test("returns correct result for deduplicated file", () => {
      const result = buildUploadResult({
        ref: mockRef,
        blob: mockBlob,
        wasDeduplicated: true,
        bytesSaved: 1024,
      });

      expect(result.wasDeduplicated).toBe(true);
      expect(result.bytesSaved).toBe(1024);
      expect(result.message).toBe("File deduplicated — saved 1024 bytes");
    });

    test("result contains all required fields", () => {
      const result = buildUploadResult({
        ref: mockRef,
        blob: mockBlob,
        wasDeduplicated: false,
        bytesSaved: 0,
      });

      expect(result).toHaveProperty("fileReferenceId");
      expect(result).toHaveProperty("displayName");
      expect(result).toHaveProperty("sizeBytes");
      expect(result).toHaveProperty("mimeType");
      expect(result).toHaveProperty("sha256Hash");
      expect(result).toHaveProperty("wasDeduplicated");
      expect(result).toHaveProperty("bytesSaved");
      expect(result).toHaveProperty("message");
    });
  });
});
