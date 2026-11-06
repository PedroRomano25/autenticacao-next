import { z } from 'zod';

// D6: helper do Mailpit pela API REST (porta 8025 do docker-compose.yml, só em 127.0.0.1).
// Os testes de integração e de contrato leem por aqui o que o SmtpEmailSender entregou.
const MAILPIT_API_URL = 'http://127.0.0.1:8025/api/v1';
// A listagem vem da mais nova para a mais antiga; o e-mail recém-enviado está na primeira página.
const MESSAGE_LIST_LIMIT = 200;

const addressSchema = z.object({ Name: z.string(), Address: z.string() });

const messageSummarySchema = z.object({
  ID: z.string(),
  From: addressSchema,
  To: z.array(addressSchema),
  Subject: z.string(),
});

const messageListSchema = z.object({ messages: z.array(messageSummarySchema) });

const messageDetailSchema = messageSummarySchema.extend({ HTML: z.string(), Text: z.string() });

type MailpitMessageSummary = z.infer<typeof messageSummarySchema>;
type MailpitMessage = z.infer<typeof messageDetailSchema>;

async function requestMailpit(path: string): Promise<unknown> {
  const response = await fetch(`${MAILPIT_API_URL}${path}`);
  if (!response.ok) throw new Error(`Mailpit respondeu ${String(response.status)} em ${path}`);
  return response.json();
}

function isAddressedTo(message: MailpitMessageSummary, to: string): boolean {
  return message.To.some(({ Address }) => Address.toLowerCase() === to.toLowerCase());
}

/** Mensagens entregues ao destinatário, da mais nova para a mais antiga. */
export async function listMessagesTo(to: string): Promise<MailpitMessageSummary[]> {
  const body = await requestMailpit(`/messages?limit=${String(MESSAGE_LIST_LIMIT)}`);
  return messageListSchema.parse(body).messages.filter((message) => isAddressedTo(message, to));
}

/** Último e-mail entregue ao destinatário, com HTML e texto; `undefined` se não houver nenhum. */
export async function findLatestMessageTo(to: string): Promise<MailpitMessage | undefined> {
  const latest = (await listMessagesTo(to)).at(0);
  if (latest === undefined) return undefined;
  return messageDetailSchema.parse(await requestMailpit(`/message/${encodeURIComponent(latest.ID)}`));
}

/** Esvazia a caixa do Mailpit. */
export async function clearMailbox(): Promise<void> {
  const response = await fetch(`${MAILPIT_API_URL}/messages`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Mailpit respondeu ${String(response.status)} ao limpar a caixa`);
}
