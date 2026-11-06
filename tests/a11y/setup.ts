import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

// Sem `globals: true`, a Testing Library não registra a limpeza do DOM sozinha.
afterEach(cleanup);
