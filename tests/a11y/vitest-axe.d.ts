// D6: o vitest-axe 0.1.0 declara o matcher no namespace global `Vi` (Vitest antigo); o Vitest
// atual lê os matchers da interface `Matchers` do módulo `vitest`.
import 'vitest';

declare module 'vitest' {
  // Os parâmetros de tipo repetem os da declaração original (exigência do declaration merging, TS2428).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- T precisa existir para o merge com a interface do vitest
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    toHaveNoViolations: () => R;
  }
}
