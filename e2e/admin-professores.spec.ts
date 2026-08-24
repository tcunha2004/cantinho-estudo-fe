import { adminHeaders, API, expect, login, reactivate, test } from './helpers';

/*
 * Tela de professores: ganhos do mês, modal de comissão, edição do professor e
 * a geração do link de cadastro.
 */
test.describe('admin · professores', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await page.getByRole('link', { name: 'Professores' }).click();
    await expect(page).toHaveURL(/\/professores$/);
  });

  test('mostra o card do professor com aulas e valor a receber', async ({ page }) => {
    const card = page.locator('div').filter({ hasText: 'Professor Teste' }).first();

    await expect(page.getByRole('heading', { name: 'Professor Teste' })).toBeVisible();
    await expect(card).toContainText('Aulas no mês');
    await expect(card).toContainText('A receber');
    /* Valor sempre em reais, nunca em dólar nem cru. */
    await expect(card).toContainText(/R\$/);
  });

  test('total a pagar aparece em reais, sem NaN', async ({ page }) => {
    const total = page.getByText('Total a pagar aos professores', { exact: false });

    await expect(total).toBeVisible();
    const texto = (await page.locator('section').first().textContent()) ?? '';
    expect(texto).toMatch(/R\$/);
    expect(texto).not.toContain('NaN');
  });

  test('modal de comissão lista a comissão por hora de cada região', async ({ page }) => {
    await page.getByRole('button', { name: 'Comissão' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal.getByRole('heading', { name: 'Comissão por região' })).toBeVisible();
    await expect(modal).toContainText('Cantinho');
    await expect(modal).toContainText('Vila da Serra');
    await expect(modal).toContainText(/R\$/);
    expect(await modal.textContent()).not.toContain('NaN');

    await modal.getByRole('button', { name: 'Fechar' }).click();
    await expect(modal).toHaveCount(0);
  });

  test('clicar no card abre o detalhe do professor', async ({ page }) => {
    await page.getByRole('heading', { name: 'Professor Teste' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal.getByRole('heading', { name: 'Detalhes do professor' })).toBeVisible();
    await expect(modal).toContainText('prof@teste.com');
    await expect(modal).toContainText('Matemática');
    await expect(modal).toContainText('Ativo');
  });

  test('edita bio e matérias e o que foi salvo persiste', async ({ page }) => {
    await page.getByRole('heading', { name: 'Professor Teste' }).click();
    const modal = page.getByRole('dialog');
    await modal.getByRole('button', { name: 'Editar' }).click();

    await modal.locator('#bio').fill('Bio escrita pelo teste E2E');
    await modal.getByRole('checkbox').nth(1).check();
    await modal.getByRole('button', { name: 'Salvar' }).click();

    await expect(modal.getByRole('heading', { name: 'Detalhes do professor' })).toBeVisible();
    await expect(modal).toContainText('Bio escrita pelo teste E2E');

    await page.reload();
    await page.getByRole('heading', { name: 'Professor Teste' }).click();
    await expect(page.getByRole('dialog')).toContainText('Bio escrita pelo teste E2E');

    /* Devolve as matérias ao estado do seed: só Matemática. */
    const modalDepois = page.getByRole('dialog');
    await modalDepois.getByRole('button', { name: 'Editar' }).click();
    const marcados = modalDepois.getByRole('checkbox');
    const total = await marcados.count();
    for (let index = 0; index < total; index += 1) {
      const caixa = marcados.nth(index);
      const nome = (await caixa.evaluate((el) => el.parentElement?.textContent ?? '')).trim();
      if (nome === 'Matemática') {
        await caixa.check();
      } else if (await caixa.isChecked()) {
        await caixa.uncheck();
      }
    }
    await modalDepois.getByRole('button', { name: 'Salvar' }).click();
    await expect(modalDepois.getByRole('heading', { name: 'Detalhes do professor' })).toBeVisible();
  });

  test('e-mail inválido não é salvo', async ({ page }) => {
    await page.getByRole('heading', { name: 'Professor Teste' }).click();
    const modal = page.getByRole('dialog');
    await modal.getByRole('button', { name: 'Editar' }).click();

    await modal.locator('#email').fill('sem-arroba');
    await modal.getByRole('button', { name: 'Salvar' }).click();

    await expect(modal.getByRole('heading', { name: 'Editar professor' })).toBeVisible();
  });

  /*
   * O começo do cadastro de professor. O teste para no link gerado e no
   * formulário público: aprovar criaria um usuário de verdade no banco de
   * desenvolvimento, e a aprovação já é coberta por teste de unidade.
   */
  test('gera o link de cadastro do professor', async ({ page }) => {
    await page.getByRole('button', { name: 'Novo professor' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal.getByRole('heading', { name: 'Novo professor' })).toBeVisible();
    await expect(modal).toContainText('matérias que leciona');

    /* O e-mail identifica o link: sem ele o botão nem habilita. */
    const gerar = modal.getByRole('button', { name: 'Gerar' });
    await expect(gerar).toBeDisabled();
    await modal.locator('#linkStudentEmail').fill(`e2e.prof.${Date.now()}@teste.com`);
    await gerar.click();

    const linkInput = modal.getByLabel('Link de cadastro');
    await expect(linkInput).toBeVisible();
    const url = await linkInput.inputValue();
    expect(url, 'link de cadastro do professor').toContain('/cadastro/professor/');

    /* O formulário abre sem sessão nenhuma — é público. */
    await page.evaluate(() => localStorage.clear());
    await page.goto(url);

    await expect(page.getByRole('heading', { name: 'Dados do professor' })).toBeVisible();
    await expect(page.getByText('Matérias que você leciona')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });

  test('inativar tira o professor da listagem de ganhos', async ({ page, request }) => {
    const headers = await adminHeaders(request);
    const summary = (await (
      await request.get(`${API}/teachers/all/monthly-earnings`, {
        headers,
        params: { month: new Date().toISOString().slice(0, 7) },
      })
    ).json()) as { teachers: { id: string; name: string }[] };
    const professor = summary.teachers.find((item) => item.name === 'Professor Teste')!;

    await page.getByRole('heading', { name: 'Professor Teste' }).click();
    const modal = page.getByRole('dialog');

    await modal.getByRole('button', { name: 'Inativar professor' }).click();
    await expect(modal.getByText('Inativar este professor?')).toBeVisible();
    await modal.getByRole('button', { name: 'Inativar professor' }).click();

    await expect(modal).toContainText('Inativo');
    await modal.getByRole('button', { name: 'Fechar' }).click();

    await expect(page.getByRole('heading', { name: 'Professor Teste' })).toHaveCount(0);

    await reactivate(request, 'teachers', professor.id);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Professor Teste' })).toBeVisible();
  });
});
