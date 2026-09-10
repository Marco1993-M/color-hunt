import { createAdminClient } from "@/lib/admin-supabase";

export async function drainAssetCleanupQueue(admin = createAdminClient()) {
  const { data: jobs, error } = await admin.from("asset_cleanup_queue").select("id, bucket, storage_path").order("created_at").limit(200);
  if (error) throw error;
  const failures: string[] = [];
  for (const job of jobs ?? []) {
    const removed = await admin.storage.from(job.bucket).remove([job.storage_path]);
    if (removed.error) { failures.push(job.id); continue; }
    const acknowledged = await admin.from("asset_cleanup_queue").delete().eq("id", job.id);
    if (acknowledged.error) failures.push(job.id);
  }
  return { processed: (jobs?.length ?? 0) - failures.length, failures };
}
