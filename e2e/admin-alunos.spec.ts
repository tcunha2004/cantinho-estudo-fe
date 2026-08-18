import { adminHeaders, API, expect, login, reactivate, test } from './helpers';

/*
 * Tela de alunos do admin: a lista, o modal de detalhes e a edição completa
 * (cadastro + contrato + responsável). O aluno usado é o do seed.
 */
test.describe('admin · alunos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await page.getByRole('link', { name: 'Alunos' }).click();
    await expect(page).toHaveURL(/\/alunos$/);
  });

  test('lista os alunos ativos com plano e região', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Alunos' })).toBeVisible();

    const linha = page.getByRole('row').filter({ hasText: 'Aluno Teste' });
    await expect(linha).toBeVisible();
    await expect(linha).toContainText('Vila da Serra');
    await expect(linha).toContainText('Ativo');
    /* Plano preenchido, seja qual for o do contrato vigente. */
    await expect(linha).toContainText(/Ouro|Prata|Bronze|Avulso/);
  });

  test('busca filtra a lista pelo nome', async ({ page }) => {
    await page.getByPlaceholder('Buscar aluno...').fill('Aluno');
    await expect(page.getByRole('row').filter({ hasText: 'Aluno Teste' })).toBeVisible();

    await page.getByPlaceholder('Buscar aluno...').fill('ninguém com esse nome');
    await expect(page.getByText('Nenhum aluno ativo encontrado.')).toBeVisible();
  });

  test('clicar na linha abre o detalhe do aluno', async ({ page }) => {
    await page.getByRole('row').filter({ hasText: 'Aluno Teste' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal.getByRole('heading', { name: 'Detalhes do aluno' })).toBeVisible();
    await expect(modal).toContainText('aluno@teste.com');
    await expect(modal).toContainText('Vila da Serra');
    await expect(modal).toContainText('Contratos');
    await expect(modal).toContainText('Ouro');
  });

  test('edita telefone, endereço e desconto e o valor persiste', async ({ page }) => {
    await page.getByRole('row').filter({ hasText: 'Aluno Teste' }).click();
    const modal = page.getByRole('dialog');
    await modal.getByRole('button', { name: 'Editar' }).click();

    await modal.locator('#phone').fill('(31) 91234-5678');
    await modal.locator('#address').fill('Rua do Teste E2E, 100');
    await modal.locator('#discountPercentage').fill('12.5');
    await modal.getByRole('button', { name: 'Salvar' }).click();

    /* Volta para o modo leitura com os dados novos. */
    await expect(modal.getByRole('heading', { name: 'Detalhes do aluno' })).toBeVisible();
    await expect(modal).toContainText('(31) 91234-5678');
    await expect(modal).toContainText('Rua do Teste E2E, 100');
    await expect(modal).toContainText('Desconto: 12.50%');

    /* Reabre da API para garantir que gravou, não só pintou na tela. */
    await page.reload();
    await page.getByRole('row').filter({ hasText: 'Aluno Teste' }).click();
    await expect(page.getByRole('dialog')).toContainText('(31) 91234-5678');
    await expect(page.getByRole('dialog')).toContainText('Desconto: 12.50%');
  });

  test('trocar o plano do contrato cria um contrato novo e fecha o antigo', async ({ page }) => {
    await page.getByRole('row').filter({ hasText: 'Aluno Teste' }).click();
    const modal = page.getByRole('dialog');
    await modal.getByRole('button', { name: 'Editar' }).click();

    /* Troca para um plano diferente do atual — Prata e Bronze existem em toda região. */
    await expect(modal.locator('#planId')).toBeVisible();
    const atual = await modal.locator('#planId').inputValue();
    const prata = await modal
      .locator('#planId option')
      .filter({ hasText: 'Prata' })
      .getAttribute('value');
    const alvo = atual === prata ? 'Bronze' : 'Prata';
    await modal.locator('#planId').selectOption({ label: alvo });

    await modal.getByRole('button', { name: 'Salvar' }).click();

    await expect(modal.getByRole('heading', { name: 'Detalhes do aluno' })).toBeVisible();
    /* Passa a ter um contrato novo no plano escolhido e o antigo cancelado. */
    await expect(modal.getByText(alvo).first()).toBeVisible();
    await expect(modal.getByText('Cancelado').first()).toBeVisible();
  });

  test('e-mail inválido não é salvo', async ({ page }) => {
    await page.getByRole('row').filter({ hasText: 'Aluno Teste' }).click();
    const modal = page.getByRole('dialog');
    await modal.getByRole('button', { name: 'Editar' }).click();

    await modal.locator('#email').fill('sem-arroba');
    await modal.getByRole('button', { name: 'Salvar' }).click();

    /* Continua no formulário, sem salvar. */
    await expect(modal.getByRole('heading', { name: 'Editar aluno' })).toBeVisible();
  });

  test('inativar tira o aluno da lista de ativos', async ({ page, request }) => {
    /* Pega o id antes: depois de inativado o aluno sai das listas da API. */
    const headers = await adminHeaders(request);
    const ativos = (await (
      await request.get(`${API}/students/active`, { headers })
    ).json()) as { id: string; name: string }[];
    const aluno = ativos.find((item) => item.name === 'Aluno Teste')!;

    await page.getByRole('row').filter({ hasText: 'Aluno Teste' }).click();
    const modal = page.getByRole('dialog');

    await modal.getByRole('button', { name: 'Inativar aluno' }).click();
    await expect(modal.getByText('Inativar este aluno?')).toBeVisible();
    await modal.getByRole('button', { name: 'Inativar aluno' }).click();

    await expect(modal).toContainText('Inativo');
    await modal.getByRole('button', { name: 'Fechar' }).click();

    await expect(page.getByRole('row').filter({ hasText: 'Aluno Teste' })).toHaveCount(0);

    /* Devolve o aluno para os próximos testes. */
    await reactivate(request, 'students', aluno.id);
    await page.reload();
    await expect(page.getByRole('row').filter({ hasText: 'Aluno Teste' })).toBeVisible();
  });
});
