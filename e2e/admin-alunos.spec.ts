import { adminHeaders, API, expect, login, test } from './helpers';

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
    await expect(page.getByText('Nenhum aluno encontrado.')).toBeVisible();
  });

  test('clicar na linha abre o detalhe do aluno', async ({ page }) => {
    await page.getByRole('row').filter({ hasText: 'Aluno Teste' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal.getByRole('heading', { name: 'Detalhes do aluno' })).toBeVisible();
    await expect(modal).toContainText('aluno@teste.com');
    await expect(modal).toContainText('Vila da Serra');
    await expect(modal).toContainText('Ativo');

    /* Contrato e parcelas moram no modal Financeiro, aberto daqui. */
    await modal.getByRole('button', { name: 'Financeiro' }).click();
    const financeiro = page.getByRole('dialog').filter({ hasText: 'Financeiro do aluno' });
    await expect(financeiro).toContainText('Ouro');
    await expect(financeiro).toContainText('Parcelas');
  });

  test('edita telefone e endereço, e o desconto fica agendado', async ({ page }) => {
    await page.getByRole('row').filter({ hasText: 'Aluno Teste' }).click();
    /* O aviso de troca agendada abre uma segunda janela — o detalhe é a primeira. */
    const modal = page.getByRole('dialog').first();
    await modal.getByRole('button', { name: 'Editar' }).click();

    await modal.locator('#phone').fill('(31) 91234-5678');
    await modal.locator('#address').fill('Rua do Teste E2E, 100');
    await modal.locator('#discountPercentage').fill('12.5');
    await modal.getByRole('button', { name: 'Salvar' }).click();

    /*
     * Desconto não muta o contrato na hora: entra como troca agendada, que só
     * vale quando a parcela em aberto for paga. O aviso explica isso.
     */
    const aviso = page.getByRole('dialog').filter({ hasText: 'Troca de plano agendada' });
    await expect(aviso).toBeVisible();
    await aviso.getByRole('button', { name: 'Entendi' }).click();

    /* Cadastro volta para leitura com os dados novos. */
    await expect(modal.getByRole('heading', { name: 'Detalhes do aluno' })).toBeVisible();
    await expect(modal).toContainText('(31) 91234-5678');
    await expect(modal).toContainText('Rua do Teste E2E, 100');

    /* Reabre da API para garantir que gravou, não só pintou na tela. */
    await page.reload();
    await page.getByRole('row').filter({ hasText: 'Aluno Teste' }).click();
    const reaberto = page.getByRole('dialog').first();
    await expect(reaberto).toContainText('(31) 91234-5678');

    await reaberto.getByRole('button', { name: 'Editar' }).click();
    await expect(reaberto.locator('#discountPercentage')).toHaveValue(/^12\.50?$/);
    await expect(reaberto).toContainText('já agendada');

    /* Desistir: voltar ao valor atual do contrato limpa o agendamento. */
    await reaberto.locator('#discountPercentage').fill('');
    await reaberto.getByRole('button', { name: 'Salvar' }).click();
    await expect(reaberto.getByRole('heading', { name: 'Detalhes do aluno' })).toBeVisible();
    await reaberto.getByRole('button', { name: 'Editar' }).click();
    await expect(reaberto).not.toContainText('já agendada');
  });

  test('trocar o plano agenda a troca em vez de aplicar na hora', async ({ page }) => {
    await page.getByRole('row').filter({ hasText: 'Aluno Teste' }).click();
    const modal = page.getByRole('dialog').first();
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

    /*
     * A troca não vale na hora: fica agendada até a mensalidade do mês ser
     * paga, de modo que o mês da solicitação é cobrado pelo plano antigo.
     */
    const aviso = page.getByRole('dialog').filter({ hasText: 'Troca de plano agendada' });
    await expect(aviso).toContainText(alvo);
    await aviso.getByRole('button', { name: 'Entendi' }).click();

    await expect(modal.getByRole('heading', { name: 'Detalhes do aluno' })).toBeVisible();
    await modal.getByRole('button', { name: 'Editar' }).click();
    await expect(modal).toContainText('já agendada');

    /* Desistir: escolher o plano atual de volta limpa o agendamento. */
    await modal.locator('#planId').selectOption(atual);
    await modal.getByRole('button', { name: 'Salvar' }).click();
    await expect(modal.getByRole('heading', { name: 'Detalhes do aluno' })).toBeVisible();
    await modal.getByRole('button', { name: 'Editar' }).click();
    await expect(modal).not.toContainText('já agendada');
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

  test('inativar marca o aluno como inativo na lista', async ({ page, request }) => {
    /* Pega o id antes: depois de inativado o aluno sai das listas de ativos. */
    const headers = await adminHeaders(request);
    const ativos = (await (
      await request.get(`${API}/students/active`, { headers })
    ).json()) as { id: string; name: string }[];
    const aluno = ativos.find((item) => item.name === 'Aluno Teste')!;

    await page.getByRole('row').filter({ hasText: 'Aluno Teste' }).click();
    const modal = page.getByRole('dialog').first();

    await modal.getByRole('button', { name: 'Inativar aluno' }).click();
    await expect(modal.getByText('Inativar este aluno?')).toBeVisible();
    await modal.getByRole('button', { name: 'Inativar aluno' }).click();

    await expect(modal).toContainText('Inativo');
    await modal.getByRole('button', { name: 'Fechar' }).click();

    /* A tabela lista todos os alunos: a linha fica, com o status novo. */
    await expect(page.getByRole('row').filter({ hasText: 'Aluno Teste' })).toContainText('Inativo');

    /*
     * Devolve o aluno E o contrato: inativar cancela o contrato vigente, e sem
     * contrato ativo as suítes de agenda, aluno e professor ficam sem aluno com
     * quem trabalhar.
     */
    const restaurado = await request.patch(`${API}/students/${aluno.id}`, {
      headers,
      data: { active: true, contractStatus: 'active' },
    });
    expect(restaurado.status(), await restaurado.text()).toBe(200);

    await page.reload();
    await expect(page.getByRole('row').filter({ hasText: 'Aluno Teste' })).toContainText('Ativo');
  });
});
