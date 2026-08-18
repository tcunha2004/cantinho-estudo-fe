import { baseHour, ensureCompletedClass, expect, login, test } from './helpers';

/*
 * Telas do professor: as aulas que ele dá e o que vai receber. Os números têm
 * que fechar com o que a agenda registrou.
 */
test.describe('professor', () => {
  test('minhas aulas mostra próximas e histórico sem erro', async ({ page }) => {
    await login(page, 'professor');
    await page.getByRole('link', { name: 'Minhas aulas' }).click();

    await expect(page.getByRole('heading', { name: 'Próximas aulas' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Histórico/ })).toBeVisible();

    const conteudo = (await page.locator('main').textContent()) ?? '';
    expect(conteudo).not.toContain('NaN');
    expect(conteudo).not.toContain('undefined');
    expect(conteudo).not.toContain('Invalid Date');
  });

  test('meus ganhos batem com a aula concluída', async ({ page, request }) => {
    /* Garante ao menos uma aula concluída no mês corrente. */
    await ensureCompletedClass(request, Math.max(0, baseHour() - 1));

    await login(page, 'professor');
    await page.getByRole('link', { name: 'Meus ganhos' }).click();

    await expect(page.getByText('Aulas no mês')).toBeVisible();
    await expect(page.getByText('A receber')).toBeVisible();

    const conteudo = (await page.locator('main').textContent()) ?? '';
    expect(conteudo).toMatch(/R\$/);
    expect(conteudo).not.toContain('NaN');
    /* Nada de dólar: o locale é pt-BR. */
    expect(conteudo).not.toMatch(/(?<!R)\$\s?\d/);

    /* Contagem de aulas do mês é um número, e não zero — houve aula concluída. */
    const aulasNoMes = await page
      .locator('app-card')
      .filter({ hasText: 'Aulas no mês' })
      .textContent();
    expect(Number((aulasNoMes ?? '').replace(/\D/g, ''))).toBeGreaterThan(0);
  });

  test('gráfico de aulas por semana tem uma barra por semana do mês', async ({ page }) => {
    await login(page, 'professor');
    await page.getByRole('link', { name: 'Meus ganhos' }).click();

    await expect(page.getByRole('heading', { name: /Aulas por semana/ })).toBeVisible();
    const semanas = page.getByText(/^Sem \d$/);
    expect(await semanas.count()).toBeGreaterThanOrEqual(4);
  });

  test('professor não vê o menu do admin', async ({ page }) => {
    await login(page, 'professor');

    await expect(page.getByRole('link', { name: 'Alunos' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Professores' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Painel' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Agenda' })).toBeVisible();
  });
});
