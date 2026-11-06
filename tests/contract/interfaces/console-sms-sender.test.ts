import { vi } from 'vitest';
import { z } from 'zod';

import { logger } from '@/lib/logger';
import { ConsoleSmsSender } from '@/lib/notifications/console-sms-sender';
import { describeSmsSenderContract, type DeliveredSms } from '@/tests/contract/interfaces/sms-sender-contract';
import { captureLogLines, type LogCapture } from '@/tests/helpers/log-capture';

// O "transporte" do ConsoleSmsSender é o logger: o entregue são as linhas `sms_sent_dev`.
const smsSentLineSchema = z.object({ event: z.literal('sms_sent_dev'), to: z.string(), text: z.string() });

const LOGGER_FAILURE_DETAIL = 'EPIPE: stdout do servidor fechado';

function readDeliveredFrom(log: LogCapture) {
  return (to: string): Promise<readonly DeliveredSms[]> =>
    Promise.resolve(
      log.readLines().flatMap((line) => {
        const parsed = smsSentLineSchema.safeParse(line);
        return parsed.success && parsed.data.to === to ? [{ to: parsed.data.to, text: parsed.data.text }] : [];
      }),
    );
}

describeSmsSenderContract('ConsoleSmsSender', {
  createHarness: () => {
    const log = captureLogLines();
    return Promise.resolve({ sender: new ConsoleSmsSender(), readDelivered: readDeliveredFrom(log) });
  },
  createFailingHarness: () => {
    const log = captureLogLines();
    vi.spyOn(logger, 'info').mockImplementation(() => {
      throw new Error(LOGGER_FAILURE_DETAIL);
    });
    return Promise.resolve({
      sender: new ConsoleSmsSender(),
      readDelivered: readDeliveredFrom(log),
      internalErrorDetail: LOGGER_FAILURE_DETAIL,
    });
  },
});
