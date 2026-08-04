/**
 * Unit tests for analytics service logic.
 * Tests the data transformation and calculation behavior.
 */

// --- Utility functions extracted from analyticsService for testability ---

function mapUserAnalytics(row) {
  return {
    userId: row.user_id,
    email: row.email,
    totalBytesSaved: parseInt(row.total_bytes_saved),
    dedupCount: parseInt(row.dedup_count),
    storageUsed: parseInt(row.storage_used),
    storageLimit: parseInt(row.storage_limit),
    dedupRatePercent: parseFloat(row.dedup_rate_pct),
    storageUsedPercent: parseFloat(row.storage_used_pct),
  };
}

function mapGlobalAnalytics(row) {
  return {
    totalUniqueBlobs: parseInt(row.total_unique_blobs),
    totalReferences: parseInt(row.total_references),
    totalBytesSavedGlobally: parseInt(row.total_bytes_saved_globally),
    globalDedupRatePct: parseFloat(row.global_dedup_rate_pct),
    totalS3StorageBytes: parseInt(row.total_s3_storage_bytes),
  };
}

function calculateStorageUsedPercent(storageUsed, storageLimit) {
  if (storageLimit === 0) return 0;
  return Math.round((storageUsed / storageLimit) * 100 * 100) / 100;
}

// --- Tests ---

describe("Analytics Service", () => {
  describe("mapUserAnalytics()", () => {
    const mockRow = {
      user_id: "user-uuid-123",
      email: "test@example.com",
      total_bytes_saved: "1048576",
      dedup_count: "5",
      storage_used: "2097152",
      storage_limit: "5368709120",
      dedup_rate_pct: "33.33",
      storage_used_pct: "0.04",
    };

    test("correctly maps database row to analytics object", () => {
      const result = mapUserAnalytics(mockRow);
      expect(result.userId).toBe("user-uuid-123");
      expect(result.email).toBe("test@example.com");
      expect(result.totalBytesSaved).toBe(1048576);
      expect(result.dedupCount).toBe(5);
      expect(result.storageUsed).toBe(2097152);
      expect(result.storageLimit).toBe(5368709120);
      expect(result.dedupRatePercent).toBe(33.33);
      expect(result.storageUsedPercent).toBe(0.04);
    });

    test("converts string numbers to actual numbers", () => {
      const result = mapUserAnalytics(mockRow);
      expect(typeof result.totalBytesSaved).toBe("number");
      expect(typeof result.dedupCount).toBe("number");
      expect(typeof result.storageUsed).toBe("number");
    });
  });

  describe("mapGlobalAnalytics()", () => {
    const mockRow = {
      total_unique_blobs: "150",
      total_references: "300",
      total_bytes_saved_globally: "104857600",
      global_dedup_rate_pct: "50.00",
      total_s3_storage_bytes: "524288000",
    };

    test("correctly maps global stats row", () => {
      const result = mapGlobalAnalytics(mockRow);
      expect(result.totalUniqueBlobs).toBe(150);
      expect(result.totalReferences).toBe(300);
      expect(result.totalBytesSavedGlobally).toBe(104857600);
      expect(result.globalDedupRatePct).toBe(50.00);
      expect(result.totalS3StorageBytes).toBe(524288000);
    });

    test("all fields are numbers", () => {
      const result = mapGlobalAnalytics(mockRow);
      Object.values(result).forEach(value => {
        expect(typeof value).toBe("number");
      });
    });
  });

  describe("calculateStorageUsedPercent()", () => {
    test("calculates percentage correctly", () => {
      const pct = calculateStorageUsedPercent(1073741824, 5368709120); // 1GB / 5GB = 20%
      expect(pct).toBe(20);
    });

    test("returns 0 when storage limit is 0", () => {
      const pct = calculateStorageUsedPercent(0, 0);
      expect(pct).toBe(0);
    });

    test("returns 100 when storage is at limit", () => {
      const pct = calculateStorageUsedPercent(5368709120, 5368709120);
      expect(pct).toBe(100);
    });

    test("handles zero storage used", () => {
      const pct = calculateStorageUsedPercent(0, 5368709120);
      expect(pct).toBe(0);
    });
  });
});
