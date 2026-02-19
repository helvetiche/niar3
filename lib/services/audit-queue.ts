import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";

type QueuedAuditEntry = Parameters<typeof logAuditTrailEntry>[0];

class AuditQueue {
  private queue: QueuedAuditEntry[] = [];
  private isProcessing = false;
  private batchSize = 10;
  private flushInterval = 2000;
  private timer: NodeJS.Timeout | null = null;

  enqueue(entry: QueuedAuditEntry): void {
    this.queue.push(entry);

    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.flushInterval);
    }

    if (this.queue.length >= this.batchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const batch = this.queue.splice(0, this.batchSize);

    try {
      await Promise.all(batch.map((entry) => logAuditTrailEntry(entry)));
    } catch (error) {
      console.error("Audit queue flush failed:", error);
      this.queue.unshift(...batch);
    } finally {
      this.isProcessing = false;

      if (this.queue.length > 0) {
        this.timer = setTimeout(() => this.flush(), this.flushInterval);
      }
    }
  }

  async forceFlush(): Promise<void> {
    while (this.queue.length > 0) {
      await this.flush();
    }
  }
}

export const auditQueue = new AuditQueue();

export function queueAuditLog(entry: QueuedAuditEntry): void {
  auditQueue.enqueue(entry);
}

export async function flushAuditLogs(): Promise<void> {
  await auditQueue.forceFlush();
}
