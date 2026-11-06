// D2 / spec sessao: Duração e renovação deslizante da sessão.
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_DAY = 86_400;

const SESSION_DURATION_DAYS = 30;
const SESSION_RENEWAL_INTERVAL_DAYS = 1;
// spec sessao: cópia assinada da sessão no navegador vale no máximo 5 minutos.
const SESSION_COOKIE_CACHE_MINUTES = 5;

/** `session.expiresIn`: a sessão expira 30 dias após a última renovação. */
export const SESSION_EXPIRES_IN_SECONDS = SESSION_DURATION_DAYS * SECONDS_PER_DAY;
/** `session.updateAge`: renova a expiração quando já passou 1 dia desde a última renovação. */
export const SESSION_UPDATE_AGE_SECONDS = SESSION_RENEWAL_INTERVAL_DAYS * SECONDS_PER_DAY;
/** `session.cookieCache.maxAge`: janela do cookie cache. */
export const SESSION_COOKIE_CACHE_MAX_AGE_SECONDS = SESSION_COOKIE_CACHE_MINUTES * SECONDS_PER_MINUTE;

/**
 * `advanced.ipAddress.ipAddressHeaders`: nenhum cabeçalho de IP é confiável. Não há proxy na
 * frente do app, então `X-Forwarded-For` e afins vêm do cliente; lidos, deixariam trocar a chave
 * do rate limit (`ip|path`) a cada requisição. Sem IP resolvido, o Better Auth usa 127.0.0.1 em
 * dev/test e um balde único por rota (`no-trusted-ip|path`) nos demais ambientes.
 */
export const TRUSTED_IP_ADDRESS_HEADERS: string[] = [];
