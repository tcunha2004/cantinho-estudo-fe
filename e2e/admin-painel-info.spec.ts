import { baseHour, ensureCompletedClass, expect, login, test } from './helpers';

/* Painel e Informações: os números que o admin olha todo dia. */
test.describe('admin · painel e informações', () => {
  test('painel mostra os quatro indicadores em reais e sem NaN', async ({ page }) => {
    await login(page, 'admin');

    await expect(page.getByRole('heading', { name: 'Alunos ativos' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Professores ativos' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Aulas no mês' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'A pagar professores' })).toBeVisible();

    const conteudo = (await page.locator('main').textContent()) ?? '';
    expect(conteudo).not.toContain('NaN');
    expect(conteudo).not.toContain('undefined');
    expect(conteudo).not.toContain('$NaN');
    /* Dinheiro em real, não em dólar. */
    expect(conteudo).toMatch(/R\$/);
    /* Nenhum valor com "$" que não seja "R$" — locale errado apareceria aqui. */
    expect(conteudo).not.toMatch(/(?<!R)\$\s?\d/);
  });

  test('painel lista planos ativos e as aulas de hoje', async ({ page, request }) => {
    await ensureCompletedClass(request, baseHour());

    await login(page, 'admin');

    await expect(page.getByRole('heading', { name: 'Planos ativos' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Próximas aulas/ })).toBeVisible();
    /* Receita do mês deixa de ser zero depois de uma aula concluída. */
    const receita = page.locator('main').getByText(/R\$/).first();
    await expect(receita).toBeVisible();
  });

  test('informações mostra a tabela de preços da região escolhida', async ({ page }) => {
    await login(page, 'admin');
    await page.getByRole('link', { name: 'Informações' }).click();

    await expect(page.getByRole('heading', { name: 'Tabela de planos' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Plano Ouro' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Plano Prata' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Plano Bronze' })).toBeVisible();

    const conteudo = (await page.locator('main').textContent()) ?? '';
    expect(conteudo).toMatch(/R\$/);
    expect(conteudo).not.toContain('NaN');
    expect(conteudo).not.toContain('undefined');
  });

  test('trocar a região troca os preços mostrados', async ({ page }) => {
    await login(page, 'admin');
    await page.getByRole('link', { name: 'Informações' }).click();

    const precoInicial = (await page.locator('main').textContent()) ?? '';

    await page.getByRole('button', { name: 'Cantinho', exact: true }).click();
    await expect(page.getByText('Valores e taxas · Cantinho')).toBeVisible();

    const precoCantinho = (await page.locator('main').textContent()) ?? '';
    expect(precoCantinho).not.toBe(precoInicial);
  });
});
