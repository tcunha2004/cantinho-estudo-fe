import { defineConfig, devices } from '@playwright/test';

/*
 * Testes de navegador contra o app rodando de verdade: `ng serve` na 4200 e a
 * API na 3000 (docker). Os testes compartilham o mesmo banco de desenvolvimento,
 * então rodam em série — paralelizar aqui viraria conflito de horário de aula,
 * não bug de verdade.
 *
 * Antes de rodar: banco no ar e `npm run seed` na API.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
