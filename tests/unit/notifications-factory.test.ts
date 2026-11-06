import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// lib/env.ts faz o parse no carregamento do módulo (D5): cada teste fixa o
// provedor com vi.stubEnv e importa a factory de novo depois de vi.resetModules().
async function loadNotifications() {
  const factory = await import('@/lib/notifications/factory');
  const { SmtpEmailSender } = await import('@/lib/notifications/smtp-email-sender');
  const { ConsoleSmsSender } = await import('@/lib/notifications/console-sms-sender');
  return { ...factory, SmtpEmailSender, ConsoleSmsSender };
}

describe('lib/notifications/factory', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('[notificacoes] Destino de entrega selecionado por configuração: EMAIL_PROVIDER=smtp devolve SmtpEmailSender', async () => {
    vi.stubEnv('EMAIL_PROVIDER', 'smtp');
    const { getEmailSender, SmtpEmailSender } = await loadNotifications();

    expect(getEmailSender()).toBeInstanceOf(SmtpEmailSender);
  });

  it('[notificacoes] Troca de implementação: SMS_PROVIDER=console devolve ConsoleSmsSender', async () => {
    vi.stubEnv('SMS_PROVIDER', 'console');
    const { getSmsSender, ConsoleSmsSender } = await loadNotifications();

    expect(getSmsSender()).toBeInstanceOf(ConsoleSmsSender);
  });
});
