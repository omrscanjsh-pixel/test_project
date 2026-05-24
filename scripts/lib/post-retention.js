const RETENTION_DAYS = 3;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const RETENTION_SECONDS = RETENTION_DAYS * 24 * 60 * 60;
const TTL_INDEX_NAME = "posts_createdAt_ttl";

async function ensurePostRetentionIndex(collection) {
  await collection.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: RETENTION_SECONDS, name: TTL_INDEX_NAME }
  );
}

async function purgeOldPosts(collection) {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  const { deletedCount } = await collection.deleteMany({ createdAt: { $lt: cutoff } });
  return deletedCount;
}

module.exports = {
  RETENTION_DAYS,
  ensurePostRetentionIndex,
  purgeOldPosts,
};
