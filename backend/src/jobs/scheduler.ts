import cron from 'node-cron';
import * as scheduledMessageService from '../services/scheduled-message.service.js';

let isRunning = false;

export function startScheduler(): void {
  cron.schedule('* * * * *', async () => {
    if (isRunning) return;
    isRunning = true;

    try {
      const result = await scheduledMessageService.processScheduledMessages();
      if (result.processed > 0 || result.failed > 0) {
        console.log(
          `[Scheduler] Processed ${result.processed} scheduled messages, ${result.failed} failed.`
        );
      }
    } catch (err) {
      console.error('[Scheduler] Error processing scheduled messages:', (err as Error).message);
    } finally {
      isRunning = false;
    }
  });

  console.log('[Scheduler] Started. Checking scheduled messages every minute.');
}
