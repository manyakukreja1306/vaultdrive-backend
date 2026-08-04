const cron = require("node-cron");
const fileRepo = require("../repositories/fileRepository");
const s3 = require("../config/s3");
const userRepo = require("../repositories/userRepository");

/**
 * Permanently deletes files that have been in the trash for more than 30 days.
 * Runs at 2:00 AM every day.
 */
const startTrashCleanupScheduler = () => {
  cron.schedule("0 2 * * *", async () => {
    console.log("[TrashCleanup] Running scheduled trash cleanup...");

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const trashedFiles = await fileRepo.findTrashedBefore(cutoffDate);

      if (trashedFiles.length === 0) {
        console.log("[TrashCleanup] No files to permanently delete.");
        return;
      }

      console.log(`[TrashCleanup] Found ${trashedFiles.length} file(s) to permanently delete.`);

      for (const ref of trashedFiles) {
        try {
          // Hard delete the file reference
          await fileRepo.hardDelete(ref.id);

          // Decrement blob reference count
          const refCountResult = await fileRepo.decrementReferenceCount(ref.blob_id);

          // If no more references, delete from S3 and remove blob
          if (refCountResult && refCountResult.reference_count <= 0) {
            // Need to get s3_key from blob — ref doesn't have it directly after hardDelete
            // But we have the blob_id, so query it
            const { Pool } = require("pg");
            const db = require("../config/db");
            const blobResult = await db.query("SELECT s3_key, size_bytes FROM file_blobs WHERE id = $1", [ref.blob_id]);
            if (blobResult.rows.length > 0) {
              const blob = blobResult.rows[0];
              await s3.deleteObject(blob.s3_key);
              await fileRepo.deleteBlobById(ref.blob_id);
            }
          }

          // Update user's storage_used
          const user = await userRepo.findById(ref.user_id);
          if (user) {
            const newStorage = Math.max(0, user.storage_used - (ref.size_bytes || 0));
            await userRepo.updateStorageUsed(ref.user_id, newStorage);
          }

          console.log(`[TrashCleanup] Permanently deleted file reference: ${ref.id}`);
        } catch (fileErr) {
          console.error(`[TrashCleanup] Error deleting file ${ref.id}:`, fileErr.message);
        }
      }

      console.log("[TrashCleanup] Trash cleanup complete.");
    } catch (err) {
      console.error("[TrashCleanup] Scheduler error:", err.message);
    }
  });

  console.log("[TrashCleanup] Trash cleanup scheduler started — runs at 2:00 AM daily.");
};

module.exports = { startTrashCleanupScheduler };
