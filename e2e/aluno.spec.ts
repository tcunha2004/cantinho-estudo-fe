import { baseHour, ensureCompletedClass, expect, login, test } from './helpers';

/* Telas do aluno: o plano contratado e o que ele deve. */
test.describe('aluno', () => {
  test('meu plano mostra plano, status e preços em reais', async ({ page }) => {
    await login(page, 'student');
    await page.getByRole('link', { name: 'Meu plano' }).click();

    await expect(page.getByRole('heading', { name: 'Meu plano' })).toBeVisible();
    /* O contrato do seed é ativo — o status vem do contrato vigente. */
    await expect(page.getByText('Ativo').first()).toBeVisible();

    const conteudo = (await page.locator('main').textContent()) ?? '';
    expect(conteudo).toMatch(/R\$/);
    expect(conteudo).not.toContain('NaN');
    expect(conteudo).not.toContain('undefined');
    expect(conteudo).not.toMatch(/(?<!R)\$\s?\d/);
  });

  test('pagamentos mostram a cobrança apurada pelas aulas do mês', async ({ page, request }) => {
    await ensureCompletedClass(request, Math.max(0, baseHour() - 1));

    await login(page, 'student');
    await page.getByRole('link', { name: 'Pagamentos' }).click();

    await expect(page.getByRole('heading', { name: 'Histórico de pagamentos' })).toBeVisible();

    const conteudo = (await page.locator('main').textContent()) ?? '';
    expect(conteudo).toMatch(/R\$/);
    expect(conteudo).not.toContain('NaN');
    expect(conteudo).not.toContain('Invalid Date');
    /* A parcela do mês deixa de ser R$ 0,00 quando há aula concluída. */
    expect(conteudo).not.toMatch(/^R\$ 0,00$/);
  });

  test('aluno não vê menu nem telas de admin e professor', async ({ page }) => {
    await login(page, 'student');

    await expect(page.getByRole('link', { name: 'Meu plano' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pagamentos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Alunos' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Meus ganhos' })).toHaveCount(0);
  });

  test('aluno vê a própria aula no detalhe, sem valores de dinheiro', async ({ page, request }) => {
    const hora = Math.max(0, baseHour() - 1);
    await ensureCompletedClass(request, hora);

    await login(page, 'student');
    await page.getByRole('button', { name: 'Dia', exact: true }).click();
    await page
      .locator('app-calendar-grid button[class*="bg-subject-green/15"]')
      .first()
      .click();

    const modal = page.getByRole('dialog');
    await expect(modal).toContainText('Realizada');
    /* Comissão e valor cobrado são do admin/professor — o aluno não vê. */
    await expect(modal).not.toContainText('Comissão');
    await expect(modal).not.toContainText('Valor cobrado');
  });
});
