// D5: valida as variáveis de ambiente ao subir o servidor, nomeando as inválidas.
// lib/env.ts só existe no runtime Node; o NEXT_RUNTIME é definido pelo próprio Next.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/lib/env');
  }
}
