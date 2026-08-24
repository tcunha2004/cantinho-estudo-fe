import { APIRequestContext, Page } from '@playwright/test';
import { adminHeaders, API, expect, login, PASSWORD, test } from './helpers';

/*
 * O cadastro por link pela tela: o admin gera, o aluno preenche sem sessão
 * nenhuma, envia, e o admin aprova pelo sino. É o único caminho do sistema que
 * cria aluno, então vale percorrer de ponta a ponta — e também pelos cantos:
 * fase inválida, link morto, e-mail repetido, rascunho retomado.
 *
 * Os e-mails são únicos por execução (`users.email` é UNIQUE e a suíte roda
 * contra o banco de desenvolvimento) e os alunos criados são inativados no fim.
 */

const STAMP = String(Date.now());

function nome(tag: string): string {
  return `E2E ${tag} ${STAMP}`;
}

function email(tag: string): string {
  return `e2e.${tag}.${STAMP}@teste.com`;
}

/*
 * Gera um link pela API — atalho para os testes cujo assunto não é gerar.
 *
 * O e-mail identifica o link, e gerar outro para o mesmo e-mail revoga o
 * anterior: por isso cada chamada sem tag ganha um e-mail próprio, senão um
 * teste derrubaria o link do seguinte.
 */
let linkSeq = 0;

async function novoLink(request: APIRequestContext, tag?: string): Promise<string> {
  const headers = await adminHeaders(request);
  const response = await request.post(`${API}/signup-links`, {
    headers,
    data: { studentEmail: email(tag ?? `link${++linkSeq}`) },
  });
  expect(response.status(), await response.text()).toBe(201);
  const { id } = (await response.json()) as { id: string };
  return `/cadastro/${id}`;
}

/* Cadastro já enviado, esperando aprovação — atalho para os testes do sino. */
async function cadastroAguardando(request: APIRequestContext, tag: string): Promise<string> {
  const url = await novoLink(request, tag);
  const id = url.split('/').pop()!;

  const form = (await (await request.get(`${API}/signup-links/${id}/form`)).json()) as {
    regions: { id: string; name: string; plans: { id: string; planType: string }[] }[];
  };
  const region = form.regions.find((item) => item.name === 'Vila da Serra')!;

  await request.patch(`${API}/signup-links/${id}`, {
    data: {
      studentName: nome(tag),
      studentEmail: email(tag),
      studentPhone: '31900001111',
      password: 'senha123',
      regionId: region.id,
      planId: region.plans.find((plan) => plan.planType === 'prata')!.id,
      guardians: [
        {
          name: `Marta ${tag}`,
          phone: '31988887777',
          cpf: '11122233344',
          isFinancialResponsible: true,
        },
      ],
    },
  });
  const submit = await request.post(`${API}/signup-links/${id}/submit`);
  expect(submit.status(), await submit.text()).toBe(201);

  return id;
}

async function contagemAguardando(request: APIRequestContext): Promise<number> {
  const headers = await adminHeaders(request);
  const waiting = (await (
    await request.get(`${API}/signup-links/waiting`, { headers })
  ).json()) as unknown[];
  return waiting.length;
}

async function inativarPorNome(request: APIRequestContext, name: string): Promise<void> {
  const headers = await adminHeaders(request);
  const students = (await (await request.get(`${API}/students/all`, { headers })).json()) as {
    id: string;
    name: string;
  }[];
  const student = students.find((item) => item.name === name);
  expect(student, `aluno "${name}" não encontrado`).toBeTruthy();
  await request.patch(`${API}/students/${student!.id}`, { headers, data: { active: false } });
}

/* Preenche a fase 1 inteira com dados válidos. */
async function preencherDados(page: Page, tag: string): Promise<void> {
  await page.locator('#studentName').fill(nome(tag));
  await page.locator('#studentEmail').fill(email(tag));
  await page.locator('#studentPhone').fill('(31) 90000-1234');
  await page.locator('#password').fill('senha123');
  await page.locator('#passwordConfirm').fill('senha123');
  await page.locator('#regionId').selectOption({ label: 'Vila da Serra' });
}

/*
 * Item da barra lateral de fases. O rótulo perde o número quando a fase é
 * concluída (o número vira um check), então o texto é o que identifica.
 */
function fase(page: Page, titulo: string) {
  return page
    .getByRole('navigation', { name: 'Etapas do cadastro' })
    .getByRole('button', { name: new RegExp(titulo) });
}

async function preencherResponsavel(page: Page, index = 0, quem = 'Marta E2E'): Promise<void> {
  await page.locator(`#guardianName${index}`).fill(quem);
  await page.locator(`#guardianPhone${index}`).fill('(31) 98888-7777');
  await page.locator(`#guardianCpf${index}`).fill(`111.222.333-4${index}`);
}

test.describe('cadastro por link · tela', () => {
  test.describe('caminho feliz', () => {
    test('do link gerado até o aluno ativo com contrato', async ({ page, request }) => {
      const tag = 'feliz';

      /* ---------- 1. Admin gera o link ---------- */
      await login(page, 'admin');
      await page.getByRole('link', { name: 'Alunos' }).click();
      await expect(page).toHaveURL(/\/alunos$/);

      await page.getByRole('button', { name: 'Novo contrato' }).click();
      const modal = page.getByRole('dialog');
      await expect(modal).toContainText('aparece nas suas notificações');

      /* O e-mail identifica o link: sem ele o botão nem habilita. */
      const gerar = modal.getByRole('button', { name: 'Gerar' });
      await expect(gerar).toBeDisabled();
      await modal.locator('#linkStudentEmail').fill(email(tag));
      await gerar.click();

      const linkInput = modal.getByLabel('Link de cadastro');
      await expect(linkInput).toBeVisible();
      const url = await linkInput.inputValue();
      expect(url, 'link de cadastro gerado').toContain('/cadastro/');
      /* O X do cabeçalho também se chama "Fechar" — aqui é o botão de ação. */
      await modal.locator('button.btn-primary', { hasText: 'Fechar' }).click();

      /* ---------- 2. Aluno preenche, sem sessão ---------- */
      await page.evaluate(() => localStorage.clear());
      await page.goto(url);

      await expect(page.getByRole('heading', { name: 'Dados do aluno' })).toBeVisible();
      const next = page.getByRole('button', { name: 'Próximo' });
      await expect(next).toBeDisabled();

      await preencherDados(page, tag);
      await page.locator('#studentAddress').fill('Rua do Teste E2E, 100');
      await expect(next).toBeEnabled();
      await next.click();

      /* Fase 2 — responsáveis. */
      await expect(page.getByRole('heading', { name: 'Responsáveis' })).toBeVisible();
      await expect(next).toBeDisabled();
      await preencherResponsavel(page);
      await expect(next).toBeEnabled();
      await next.click();

      /* Fase 3 — planos da região escolhida, com a taxa de matrícula. */
      await expect(page.getByRole('heading', { name: 'Plano' })).toBeVisible();
      await expect(page.getByText('Taxa de matrícula')).toBeVisible();
      await expect(next).toBeDisabled();
      await page.getByRole('button').filter({ hasText: 'Prata' }).first().click();
      await expect(next).toBeEnabled();
      await next.click();

      /* Fase 4 — revisão. */
      await expect(page.getByRole('heading', { name: 'Revisão' })).toBeVisible();
      await expect(page.getByRole('main')).toContainText(nome(tag));
      await expect(page.getByRole('main')).toContainText('Marta E2E');
      await expect(page.getByRole('main')).toContainText('Financeiro');

      await page.getByRole('button', { name: 'Enviar' }).click();
      await expect(page.getByRole('heading', { name: 'Seus dados foram enviados' })).toBeVisible();

      /* O link não aceita ser preenchido de novo. */
      await page.goto(url);
      await expect(page.getByText('Este cadastro já foi enviado')).toBeVisible();

      /* ---------- 3. Admin aprova pelo sino ---------- */
      await login(page, 'admin');

      const bell = page.getByLabel(/cadastros? aguardando aprovação/);
      await expect(bell).toContainText(/[1-9]/);
      await bell.click();

      const notifications = page.getByRole('dialog');
      await expect(notifications).toContainText(nome(tag));
      await notifications.getByRole('button', { name: new RegExp(nome(tag)) }).click();

      await expect(notifications).toContainText(email(tag));
      await expect(notifications).toContainText('Marta E2E');
      await notifications.locator('#discountPercentage').fill('10');
      await notifications.getByRole('button', { name: 'Confirmar e gerar contrato' }).click();

      await expect(notifications).toContainText(`${nome(tag)} agora está ativo`);
      await notifications.getByRole('button', { name: 'Fechar' }).click();

      /* ---------- 4. O aluno existe, ativo, com o plano escolhido ---------- */
      await page.getByRole('link', { name: 'Alunos' }).click();
      const row = page.getByRole('row').filter({ hasText: nome(tag) });
      await expect(row).toBeVisible();
      await expect(row).toContainText('Prata');
      await expect(row).toContainText('Vila da Serra');
      await expect(row).toContainText('Ativo');
      await expect(row).toContainText('Marta E2E');

      /* ---------- 5. O contrato e a primeira parcela, pela API ---------- */
      const headers = await adminHeaders(request);
      const students = (await (await request.get(`${API}/students/all`, { headers })).json()) as {
        id: string;
        name: string;
      }[];
      const created = students.find((item) => item.name === nome(tag));
      expect(created, 'aluno criado pelo cadastro').toBeTruthy();

      const detail = (await (
        await request.get(`${API}/students/${created!.id}`, { headers })
      ).json()) as {
        contracts: { planType: string; status: string; discountPercentage: string }[];
      };
      expect(detail.contracts[0]).toMatchObject({
        planType: 'prata',
        status: 'active',
        discountPercentage: '10.00',
      });

      const payments = (await (
        await request.get(`${API}/students/${created!.id}/payments`, { headers })
      ).json()) as { amount: string; status: string }[];
      const pricing = (await (await request.get(`${API}/regions/pricing`, { headers })).json()) as {
        name: string;
        plans: { planType: string; monthlyPrice: string }[];
      }[];
      const prata = pricing
        .find((region) => region.name === 'Vila da Serra')!
        .plans.find((plan) => plan.planType === 'prata')!;

      expect(payments).toHaveLength(1);
      expect(payments[0].status).toBe('pending');
      expect(payments[0].amount).toBe((Number(prata.monthlyPrice) * 0.9).toFixed(2));

      /* ---------- 6. Limpeza ---------- */
      await inativarPorNome(request, nome(tag));
    });

    test('aprovar sem desconto mantém o preço cheio', async ({ page, request }) => {
      const tag = 'sem-desconto';
      await cadastroAguardando(request, tag);

      await login(page, 'admin');
      await page.getByLabel(/cadastros? aguardando aprovação/).click();

      const modal = page.getByRole('dialog');
      await modal.getByRole('button', { name: new RegExp(nome(tag)) }).click();

      /* Sem desconto digitado, não existe preço riscado. */
      await expect(modal.locator('.line-through')).toHaveCount(0);
      await modal.getByRole('button', { name: 'Confirmar e gerar contrato' }).click();
      await expect(modal).toContainText(`${nome(tag)} agora está ativo`);

      const headers = await adminHeaders(request);
      const students = (await (await request.get(`${API}/students/all`, { headers })).json()) as {
        id: string;
        name: string;
      }[];
      const detail = (await (
        await request.get(`${API}/students/${students.find((s) => s.name === nome(tag))!.id}`, {
          headers,
        })
      ).json()) as { contracts: { discountPercentage: string | null }[] };
      expect(detail.contracts[0].discountPercentage).toBeNull();

      await inativarPorNome(request, nome(tag));
    });

    test('o desconto digitado aparece riscando o preço cheio', async ({ page, request }) => {
      const tag = 'risco';
      await cadastroAguardando(request, tag);

      await login(page, 'admin');
      await page.getByLabel(/cadastros? aguardando aprovação/).click();
      const modal = page.getByRole('dialog');
      await modal.getByRole('button', { name: new RegExp(nome(tag)) }).click();

      await modal.locator('#discountPercentage').fill('50');

      /* Prata da Vila da Serra: 1.800,00 cheio, 900,00 com metade de desconto. */
      await expect(modal.locator('.line-through')).toContainText('1.800,00');
      await expect(modal).toContainText('900,00');
      await expect(modal).toContainText('por mês');
    });

    test('o aluno aprovado entra no sistema e vê o próprio plano', async ({ page, request }) => {
      const tag = 'login';
      const id = await cadastroAguardando(request, tag);

      const headers = await adminHeaders(request);
      const approve = await request.post(`${API}/signup-links/${id}/approve`, {
        headers,
        data: {},
      });
      expect(approve.status(), await approve.text()).toBe(201);

      /* Entra com o e-mail e a senha que ele mesmo escolheu no formulário. */
      await page.goto('/login');
      await page.getByRole('button', { name: 'Aluno', exact: true }).click();
      await page.locator('#email').fill(email(tag));
      await page.locator('#password').fill('senha123');
      await page.getByRole('button', { name: 'Entrar' }).click();
      await expect(page).not.toHaveURL(/\/login$/);

      await page.getByRole('link', { name: 'Meu plano' }).click();
      await expect(page.getByRole('main')).toContainText('Prata');
      await expect(page.getByRole('main')).toContainText('Ativo');

      await page.getByRole('link', { name: 'Pagamentos' }).click();
      /* A primeira parcela vence no dia 10 do mês corrente — depois disso ela
       * já nasce em atraso, que é a decisão consciente do fluxo. */
      await expect(page.getByRole('main')).toContainText(/Em aberto|Em atraso/);

      await inativarPorNome(request, nome(tag));
    });
  });

  test.describe('preenchimento', () => {
    test('o rascunho volta ao recarregar a página', async ({ page, request }) => {
      const url = await novoLink(request);
      await page.goto(url);

      await preencherDados(page, 'rascunho');
      await page.getByRole('button', { name: 'Próximo' }).click();
      await expect(page.getByRole('heading', { name: 'Responsáveis' })).toBeVisible();

      await page.reload();

      /* Volta na fase 1, com o que já foi salvo — menos a senha, que só existe
       * em hash no banco. */
      await expect(page.locator('#studentName')).toHaveValue(nome('rascunho'));
      await expect(page.locator('#studentEmail')).toHaveValue(email('rascunho'));
      await expect(page.locator('#password')).toHaveValue('');
      await expect(page.locator('#regionId option:checked')).toHaveText('Vila da Serra');
    });

    test('dois responsáveis e o financeiro é o segundo', async ({ page, request }) => {
      const url = await novoLink(request);
      const id = url.split('/').pop()!;
      await page.goto(url);

      await preencherDados(page, 'dois-responsaveis');
      await page.getByRole('button', { name: 'Próximo' }).click();

      await preencherResponsavel(page, 0, 'Primeira Responsável');
      await page.getByRole('button', { name: 'Adicionar responsável' }).click();
      await preencherResponsavel(page, 1, 'Segundo Responsável');

      /* Marcar o segundo desmarca o primeiro — é rádio, nunca dois. */
      await page.locator('input[type=radio]').nth(1).check();
      await expect(page.locator('input[type=radio]').first()).not.toBeChecked();

      await page.getByRole('button', { name: 'Próximo' }).click();
      await expect(page.getByRole('heading', { name: 'Plano' })).toBeVisible();

      const salvo = (await (await request.get(`${API}/signup-links/${id}/form`)).json()) as {
        guardians: { name: string; isFinancialResponsible: boolean }[];
      };
      expect(salvo.guardians).toEqual([
        expect.objectContaining({ name: 'Primeira Responsável', isFinancialResponsible: false }),
        expect.objectContaining({ name: 'Segundo Responsável', isFinancialResponsible: true }),
      ]);
    });

    test('remover responsável devolve o financeiro para o primeiro', async ({ page, request }) => {
      const url = await novoLink(request);
      await page.goto(url);

      await preencherDados(page, 'remover');
      await page.getByRole('button', { name: 'Próximo' }).click();

      await preencherResponsavel(page, 0, 'Fica Aqui');
      await page.getByRole('button', { name: 'Adicionar responsável' }).click();
      await preencherResponsavel(page, 1, 'Sai Fora');
      await page.locator('input[type=radio]').nth(1).check();

      await page.getByRole('button', { name: 'Remover' }).nth(1).click();

      await expect(page.locator('input[type=radio]')).toHaveCount(1);
      await expect(page.locator('input[type=radio]').first()).toBeChecked();
      /* Com um responsável só, não há o que remover. */
      await expect(page.getByRole('button', { name: 'Remover' })).toHaveCount(0);
    });

    test('trocar de região limpa o plano já escolhido', async ({ page, request }) => {
      const url = await novoLink(request);
      await page.goto(url);

      await preencherDados(page, 'regiao');
      await page.getByRole('button', { name: 'Próximo' }).click();
      await preencherResponsavel(page);
      await page.getByRole('button', { name: 'Próximo' }).click();

      await expect(page.getByText('Planos disponíveis em Vila da Serra')).toBeVisible();
      await page.getByRole('button').filter({ hasText: 'Prata' }).first().click();
      await expect(page.getByRole('button', { name: 'Próximo' })).toBeEnabled();

      /* Volta duas fases pela barra lateral e troca a região. */
      await fase(page, 'Dados do aluno').click();
      await expect(page.locator('#studentName')).toHaveValue(nome('regiao'));
      await page.locator('#regionId').selectOption({ label: 'Cantinho' });
      await page.getByRole('button', { name: 'Próximo' }).click();
      await page.getByRole('button', { name: 'Próximo' }).click();

      await expect(page.getByText('Planos disponíveis em Cantinho')).toBeVisible();
      /* O plano da região antiga não vale mais. */
      await expect(page.getByRole('button', { name: 'Próximo' })).toBeDisabled();
    });

    test('a barra de fases só volta, nunca pula para frente', async ({ page, request }) => {
      const url = await novoLink(request);
      await page.goto(url);

      const irParaPlano = fase(page, 'Plano');
      await expect(irParaPlano).toBeDisabled();

      await preencherDados(page, 'barra');
      await page.getByRole('button', { name: 'Próximo' }).click();

      /* Fase concluída fica clicável; a fase 3, ainda não visitada, não. */
      await expect(fase(page, 'Dados do aluno')).toBeEnabled();
      await expect(irParaPlano).toBeDisabled();
    });

    test('os planos mostram como cada um é cobrado', async ({ page, request }) => {
      const url = await novoLink(request);
      await page.goto(url);

      await preencherDados(page, 'precos');
      await page.getByRole('button', { name: 'Próximo' }).click();
      await preencherResponsavel(page);
      await page.getByRole('button', { name: 'Próximo' }).click();

      const ouro = page.getByRole('button').filter({ hasText: 'Ouro · 3x por semana' });
      await expect(ouro).toContainText('por mês');
      await expect(ouro).toContainText('12 aulas no mês');

      /* Bronze é pacote de parcela única; a avulsa é cobrada por aula. */
      const bronze = page.getByRole('button').filter({ hasText: 'Bronze' });
      await expect(bronze).toContainText('parcela única');
      await expect(bronze).toContainText(/validade de \d+ meses/);

      const avulsa = page.getByRole('button').filter({ hasText: 'Avulso' });
      await expect(avulsa).toContainText('por aula');
      await expect(avulsa).toContainText('Aula individual, sem plano');
      await expect(avulsa).not.toContainText('por mês');
    });
  });

  test.describe('caminhos tristes', () => {
    test('cancelar não gera link nenhum', async ({ page, request }) => {
      const antes = await contagemAguardando(request);

      await login(page, 'admin');
      await page.getByRole('link', { name: 'Alunos' }).click();
      await page.getByRole('button', { name: 'Novo contrato' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();

      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(await contagemAguardando(request)).toBe(antes);
    });

    test('link que não existe mostra tela de link indisponível', async ({ page }) => {
      await page.goto('/cadastro/00000000-0000-4000-8000-000000000000');

      await expect(page.getByRole('heading', { name: 'Link indisponível' })).toBeVisible();
      await expect(page.getByText('inválido ou não encontrado')).toBeVisible();
      await expect(page.locator('#studentName')).toHaveCount(0);
    });

    test('id que nem é uuid também cai na tela de erro', async ({ page }) => {
      await page.goto('/cadastro/isso-nao-e-um-link');

      await expect(page.getByRole('heading', { name: 'Link indisponível' })).toBeVisible();
    });

    test('cada campo da fase 1 segura o avanço e explica o motivo', async ({ page, request }) => {
      const url = await novoLink(request);
      await page.goto(url);

      const next = page.getByRole('button', { name: 'Próximo' });
      await preencherDados(page, 'validacao');
      await expect(next).toBeEnabled();

      await page.locator('#studentEmail').fill('sem-arroba');
      await page.locator('#studentEmail').blur();
      await expect(next).toBeDisabled();
      await expect(page.getByText('E-mail inválido.')).toBeVisible();
      await page.locator('#studentEmail').fill(email('validacao'));

      await page.locator('#password').fill('123');
      await page.locator('#password').blur();
      await expect(next).toBeDisabled();
      await expect(page.getByText('A senha deve ter ao menos 6 caracteres.')).toBeVisible();
      await page.locator('#password').fill('senha123');

      await page.locator('#passwordConfirm').fill('outra-coisa');
      await page.locator('#passwordConfirm').blur();
      await expect(next).toBeDisabled();
      await expect(page.getByText('As senhas não conferem.')).toBeVisible();
      await page.locator('#passwordConfirm').fill('senha123');

      await page.locator('#studentName').fill('Ab');
      await page.locator('#studentName').blur();
      await expect(next).toBeDisabled();
      await expect(page.getByText('Informe o nome do aluno')).toBeVisible();
      await page.locator('#studentName').fill(nome('validacao'));

      await page.locator('#regionId').selectOption({ label: 'Selecione a região' });
      await expect(next).toBeDisabled();

      await page.locator('#regionId').selectOption({ label: 'Vila da Serra' });
      await expect(next).toBeEnabled();
    });

    test('responsável incompleto segura a fase 2', async ({ page, request }) => {
      const url = await novoLink(request);
      await page.goto(url);

      await preencherDados(page, 'guardiao');
      await page.getByRole('button', { name: 'Próximo' }).click();

      const next = page.getByRole('button', { name: 'Próximo' });
      await page.locator('#guardianName0').fill('Marta E2E');
      await page.locator('#guardianPhone0').fill('(31) 98888-7777');
      await expect(next, 'sem CPF').toBeDisabled();

      await page.locator('#guardianCpf0').fill('123');
      await page.locator('#guardianCpf0').blur();
      await expect(next, 'CPF curto').toBeDisabled();
      await expect(page.getByText('CPF inválido.')).toBeVisible();

      await page.locator('#guardianCpf0').fill('111.222.333-44');
      await expect(next).toBeEnabled();

      /* Um responsável a mais, vazio, volta a segurar a fase. */
      await page.getByRole('button', { name: 'Adicionar responsável' }).click();
      await expect(next).toBeDisabled();
    });

    test('e-mail já cadastrado é recusado no envio', async ({ page, request }) => {
      const url = await novoLink(request);
      await page.goto(url);

      await preencherDados(page, 'repetido');
      /* O e-mail do aluno do seed. */
      await page.locator('#studentEmail').fill('aluno@teste.com');
      await page.getByRole('button', { name: 'Próximo' }).click();
      await preencherResponsavel(page);
      await page.getByRole('button', { name: 'Próximo' }).click();
      await page.getByRole('button').filter({ hasText: 'Prata' }).first().click();
      await page.getByRole('button', { name: 'Próximo' }).click();

      await page.getByRole('button', { name: 'Enviar' }).click();

      await expect(page.getByText('Já existe um usuário com este e-mail')).toBeVisible();
      /* Continua na revisão, com tudo preenchido — dá para corrigir. */
      await expect(page.getByRole('heading', { name: 'Revisão' })).toBeVisible();
    });

    test('cadastro aprovado por fora não vira aluno duplicado', async ({ page, request }) => {
      const tag = 'corrida';
      const id = await cadastroAguardando(request, tag);

      await login(page, 'admin');
      await page.getByLabel(/cadastros? aguardando aprovação/).click();
      const modal = page.getByRole('dialog');
      await modal.getByRole('button', { name: new RegExp(nome(tag)) }).click();

      /* Alguém aprova pelo backend enquanto esta tela está aberta. */
      const headers = await adminHeaders(request);
      await request.post(`${API}/signup-links/${id}/approve`, { headers, data: {} });

      await modal.getByRole('button', { name: 'Confirmar e gerar contrato' }).click();
      await expect(modal).toContainText('não está aguardando aprovação');
      /* O erro aparece e a conferência continua ali, sem criar nada. */
      await expect(modal).toContainText('Confirmar e gerar contrato');

      const students = (await (await request.get(`${API}/students/all`, { headers })).json()) as {
        name: string;
      }[];
      expect(students.filter((item) => item.name === nome(tag))).toHaveLength(1);

      await inativarPorNome(request, nome(tag));
    });
  });

  test.describe('sino de notificações', () => {
    test('conta os cadastros aguardando e diminui ao aprovar', async ({ page, request }) => {
      const tag = 'contagem';
      const antes = await contagemAguardando(request);
      await cadastroAguardando(request, tag);

      await login(page, 'admin');
      const bell = page.getByLabel(/cadastros? aguardando aprovação/);
      await expect(bell).toContainText(String(antes + 1));

      await bell.click();
      const modal = page.getByRole('dialog');
      await modal.getByRole('button', { name: new RegExp(nome(tag)) }).click();
      await modal.getByRole('button', { name: 'Confirmar e gerar contrato' }).click();
      await expect(modal).toContainText('agora está ativo');

      /* A contagem cai sozinha, sem recarregar a página. */
      if (antes === 0) {
        await expect(bell).toHaveText('');
        await expect(modal).toContainText('Nenhum cadastro aguardando');
      } else {
        await expect(bell).toContainText(String(antes));
      }

      await inativarPorNome(request, nome(tag));
    });

    test('o aluno recém-aprovado entra na lista sem recarregar a página', async ({
      page,
      request,
    }) => {
      const tag = 'lista-viva';
      await cadastroAguardando(request, tag);

      await login(page, 'admin');
      await page.getByRole('link', { name: 'Alunos' }).click();
      await expect(page.getByRole('row').filter({ hasText: nome(tag) })).toHaveCount(0);

      await page.getByLabel(/cadastros? aguardando aprovação/).click();
      const modal = page.getByRole('dialog');
      await modal.getByRole('button', { name: new RegExp(nome(tag)) }).click();
      await modal.getByRole('button', { name: 'Confirmar e gerar contrato' }).click();
      await expect(modal).toContainText('agora está ativo');
      await modal.getByRole('button', { name: 'Fechar' }).click();

      /* A tabela por baixo se atualizou sozinha. */
      await expect(page.getByRole('row').filter({ hasText: nome(tag) })).toBeVisible();

      await inativarPorNome(request, nome(tag));
    });

    test('acompanha o admin em todas as páginas do painel', async ({ page }) => {
      await login(page, 'admin');

      for (const [item, url] of [
        ['Painel', /\/painel$/],
        ['Agenda', /\/agenda$/],
        ['Alunos', /\/alunos$/],
        ['Professores', /\/professores$/],
        ['Informações', /\/info$/],
      ] as const) {
        await page.getByRole('link', { name: item }).click();
        await expect(page).toHaveURL(url);
        await expect(page.getByLabel(/cadastros? aguardando aprovação/)).toBeVisible();
      }
    });

    test('não aparece para professor nem para aluno', async ({ page }) => {
      for (const role of ['professor', 'student'] as const) {
        await login(page, role);
        await expect(page.getByLabel(/cadastros? aguardando aprovação/)).toHaveCount(0);
        await page.evaluate(() => localStorage.clear());
      }
    });

    test('a lista mostra região, plano e data de envio', async ({ page, request }) => {
      const tag = 'lista';
      await cadastroAguardando(request, tag);

      await login(page, 'admin');
      await page.getByLabel(/cadastros? aguardando aprovação/).click();

      const item = page.getByRole('dialog').getByRole('button', { name: new RegExp(nome(tag)) });
      await expect(item).toContainText('Vila da Serra');
      await expect(item).toContainText('Prata');
      await expect(item).toContainText(/enviado em \d{2}\/\d{2}\/\d{4}/);
    });
  });

  /* A tela pública é nova no roteador: não pode ter mexido no login normal. */
  test('a rota pública não atrapalha o login do sistema', async ({ page }) => {
    await page.goto('/cadastro/00000000-0000-4000-8000-000000000000');
    await expect(page.getByRole('heading', { name: 'Link indisponível' })).toBeVisible();

    await page.goto('/login');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await page.locator('#email').fill('admin@teste.com');
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/painel$/);
  });
});
