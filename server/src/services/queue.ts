// Simple in-process job queue (upgrade to Bull+Redis for production)
type Job = { id: string; type: string; data: any; status: "pending" | "running" | "done" | "failed"; result?: any; error?: string; createdAt: Date; };
const jobs: Map<string, Job> = new Map();
let processing = false;
const handlers: Map<string, (data: any) => Promise<any>> = new Map();

export function registerHandler(type: string, handler: (data: any) => Promise<any>) {
  handlers.set(type, handler);
}

export function addJob(type: string, data: any): string {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  jobs.set(id, { id, type, data, status: "pending", createdAt: new Date() });
  processQueue();
  return id;
}

export function getJob(id: string): Job | undefined { return jobs.get(id); }
export function listJobs(limit = 20): Job[] { return [...jobs.values()].slice(-limit).reverse(); }

async function processQueue() {
  if (processing) return;
  processing = true;
  for (const [id, job] of jobs) {
    if (job.status !== "pending") continue;
    const handler = handlers.get(job.type);
    if (!handler) { job.status = "failed"; job.error = "No handler"; continue; }
    job.status = "running";
    try { job.result = await handler(job.data); job.status = "done"; }
    catch (e: any) { job.status = "failed"; job.error = e.message; }
  }
  processing = false;
  // Cleanup old jobs (keep last 50)
  const all = [...jobs.keys()];
  if (all.length > 50) { for (let i = 0; i < all.length - 50; i++) jobs.delete(all[i]); }
}

export default { addJob, getJob, listJobs, registerHandler };
