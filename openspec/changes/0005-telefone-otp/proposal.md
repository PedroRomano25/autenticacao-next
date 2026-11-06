# Proposal

## Why

O telefone é um segundo canal de acesso, útil para quem não tem o e-mail à mão, e a base para avisos por SMS no futuro. A fundação já criou o `SmsSender` (destino de console em desenvolvimento); falta o fluxo de verificar o número e entrar com um código de uso único (OTP).

## What Changes

- Habilitar o plugin `phoneNumber` do Better Auth.
- Normalizar e validar o telefone em formato E.164 num lugar só em `lib/`, substituindo a regex hoje em `ConsoleSmsSender` (pendência da fundação), com `libphonenumber-js` (dependência nova, prevista na D4 da fundação).
- Verificação de telefone: o usuário informa o número, recebe um OTP por SMS e confirma o código; o número fica marcado como verificado.
- Login por telefone: o usuário informa o número verificado, recebe um OTP e, com o código correto, a sessão é criada. A resposta não revela se o número está cadastrado.
- OTP com tamanho, validade e número máximo de tentativas definidos; código errado demais invalida o OTP.
- Limites de tentativas para envio e verificação de OTP, por número e por IP.
- Trava de ambiente: `lib/env.ts` recusa `SMS_PROVIDER=console` com `NODE_ENV=production` (pendência de segurança da fundação).

## Capabilities

### New Capabilities
- `autenticacao-por-telefone`: verificação do número por OTP, login por telefone e regras do código (tamanho, validade, tentativas).

### Modified Capabilities
- `notificacoes`: validação de telefone passa a usar a normalização E.164 central; o destino de console fica restrito a ambientes que não são de produção.
- `limite-de-tentativas`: novas regras para envio e verificação de OTP.

## Impact

- **Código:** `lib/auth.ts` (plugin `phoneNumber`), `lib/phone.ts` (normalização E.164), `ConsoleSmsSender`, `lib/env.ts`, actions e schemas, telas de verificação e de login por telefone (uiux), `lib/routes.ts`.
- **Banco:** colunas de telefone no usuário (`phone_number`, `phone_number_verified`) pelo schema do Better Auth; nova migração (dev-db).
- **Dependências:** `libphonenumber-js`.
- **Depende de:** 0002 (limites de tentativas, telas de autenticação).
- **Fora de escopo:** provedor real de SMS (Twilio etc.), 2FA por SMS, cadastro só com telefone (a definir no design).

## Perguntas em aberto (para o design)

- Cadastro só com telefone, sem e-mail, ou o telefone sempre se vincula a uma conta que já existe?
- Tamanho do OTP, validade e número máximo de tentativas.
- Países aceitos (só +55 ou qualquer E.164).
