import { APIRequestContext } from '@playwright/test';
import { adminHeaders, API, expect, token, test } from './helpers';

/*
 * As bordas do cadastro por link, direto na API: quem pode chamar o quê e o
 * que o servidor recusa. São coisas que a tela não alcança — o formulário é
 * público, então a única barreira real contra um cadastro incompleto (ou contra
 * um aluno criado por quem não é admin) é o backend.
 */

const STAMP = String(Date.now());

/* Rascunho completo, pronto para envio — os testes tiram uma peça de cada vez. */
async function completeDraft(
  request: APIRequestContext,
  suffix: string,
): Promise<{ id: string; regionId: string; planId: string; email: string }> {
  const headers = await adminHeaders(request);
  const created = await request.post(`${API}/signup-links`, { headers });
  expect(created.status(), await created.text()).toBe(201);
  const { id } = (await created.json()) as { id: string };

  const form = (await (await request.get(`${API}/signup-links/${id}/form`)).json()) as {
    regions: { id: string; name: string; plans: { id: string; planType: string }[] }[];
  };
  const region = form.regions.find((item) => item.name === 'Vila da Serra')!;
  const plan = region.plans.find((item) => item.planType === 'prata')!;
  const email = `api.${suffix}.${STAMP}@teste.com`;

  const patch = await request.patch(`${API}/signup-links/${id}`, {
    data: {
      studentName: `API ${suffix} ${STAMP}`,
      studentEmail: email,
      studentPhone: '31900001111',
      studentAddress: null,
      password: 'senha123',
      regionId: region.id,
      planId: plan.id,
      guardians: [
        {
          name: 'Marta API',
          phone: '31988887777',
          cpf: '11122233344',
          isFinancialResponsible: true,
        },
      ],
    },
  });
  expect(patch.status(), await patch.text()).toBe(200);

  return { id, regionId: region.id, planId: plan.id, email };
}

/** Deixa o aluno criado fora das listas de ativos. */
async function deactivate(request: APIRequestContext, studentId: string): Promise<void> {
  const headers = await adminHeaders(request);
  await request.patch(`${API}/students/${studentId}`, { headers, data: { active: false } });
}

test.describe('cadastro por link · API', () => {
  test.describe('quem pode o quê', () => {
    test('gerar link exige sessão de admin', async ({ request }) => {
      const semToken = await request.post(`${API}/signup-links`);
      expect(semToken.status(), 'sem token').toBe(401);

      for (const role of ['professor', 'student'] as const) {
        const response = await request.post(`${API}/signup-links`, {
          headers: { Authorization: `Bearer ${await token(request, role)}` },
        });
        expect(response.status(), `como ${role}`).toBe(403);
      }
    });

    test('a fila de cadastros é só do admin', async ({ request }) => {
      expect((await request.get(`${API}/signup-links/waiting`)).status()).toBe(401);

      for (const role of ['professor', 'student'] as const) {
        const response = await request.get(`${API}/signup-links/waiting`, {
          headers: { Authorization: `Bearer ${await token(request, role)}` },
        });
        expect(response.status(), `como ${role}`).toBe(403);
      }
    });

    test('aprovar é só do admin', async ({ request }) => {
      const { id } = await completeDraft(request, 'aprovar-guarda');
      await request.post(`${API}/signup-links/${id}/submit`);

      expect((await request.post(`${API}/signup-links/${id}/approve`)).status()).toBe(401);

      const comoProfessor = await request.post(`${API}/signup-links/${id}/approve`, {
        headers: { Authorization: `Bearer ${await token(request, 'professor')}` },
        data: {},
      });
      expect(comoProfessor.status()).toBe(403);
    });

    /* O formulário é público de propósito: quem preenche ainda não tem conta. */
    test('preencher e enviar não pede sessão nenhuma', async ({ request }) => {
      const { id } = await completeDraft(request, 'publico');

      expect((await request.get(`${API}/signup-links/${id}/form`)).status()).toBe(200);
      expect((await request.post(`${API}/signup-links/${id}/submit`)).status()).toBe(201);
    });
  });

  test.describe('link inválido', () => {
    test('uuid que não existe é 404', async ({ request }) => {
      const fake = '00000000-0000-4000-8000-000000000000';
      expect((await request.get(`${API}/signup-links/${fake}/form`)).status()).toBe(404);
      /* Nome válido de propósito: o 404 tem que vir do link, não da validação. */
      const patch = await request.patch(`${API}/signup-links/${fake}`, {
        data: { studentName: 'Ana Souza' },
      });
      expect(patch.status()).toBe(404);
    });

    test('id que não é uuid é 400', async ({ request }) => {
      expect((await request.get(`${API}/signup-links/nao-e-uuid/form`)).status()).toBe(400);
    });

    test('link já enviado não aceita mais edição', async ({ request }) => {
      const { id } = await completeDraft(request, 'travado');
      await request.post(`${API}/signup-links/${id}/submit`);

      expect((await request.get(`${API}/signup-links/${id}/form`)).status()).toBe(410);

      const patch = await request.patch(`${API}/signup-links/${id}`, {
        data: { studentName: 'Trocado à força' },
      });
      expect(patch.status()).toBe(410);

      /* E o nome de verdade continua o que foi enviado. */
      const headers = await adminHeaders(request);
      const waiting = (await (
        await request.get(`${API}/signup-links/waiting`, { headers })
      ).json()) as { id: string; studentName: string }[];
      expect(waiting.find((item) => item.id === id)?.studentName).toContain('API travado');
    });
  });

  test.describe('validação do rascunho', () => {
    test('recusa campo mal preenchido', async ({ request }) => {
      const { id } = await completeDraft(request, 'validacao');

      const casos: [string, object][] = [
        ['e-mail sem arroba', { studentEmail: 'sem-arroba' }],
        ['senha curta', { password: '123' }],
        ['nome curto', { studentName: 'Ab' }],
        ['região que não é uuid', { regionId: 'qualquer-coisa' }],
        ['lista de responsáveis vazia', { guardians: [] }],
        ['responsável sem cpf', { guardians: [{ name: 'Marta', phone: '31988887777' }] }],
        ['cpf curto', { guardians: [{ name: 'Marta', phone: '3198888', cpf: '123' }] }],
        ['campo que não existe', { apelido: 'Aninha' }],
      ];

      for (const [caso, data] of casos) {
        const response = await request.patch(`${API}/signup-links/${id}`, { data });
        expect(response.status(), caso).toBe(400);
      }
    });
  });

  test.describe('envio', () => {
    test('recusa envio incompleto, campo a campo', async ({ request }) => {
      /* Cada peça é apagada de um rascunho novo, para os casos não se somarem. */
      const casos: [string, object, string][] = [
        ['nome', { studentName: null }, 'nome do aluno'],
        ['telefone', { studentPhone: null }, 'telefone'],
        ['região', { regionId: null }, 'região'],
        ['plano', { planId: null }, 'plano'],
      ];

      for (const [campo, apagar, mensagem] of casos) {
        const { id } = await completeDraft(request, `falta-${campo}`);
        expect(
          (await request.patch(`${API}/signup-links/${id}`, { data: apagar })).status(),
          `apagar ${campo}`,
        ).toBe(200);

        const response = await request.post(`${API}/signup-links/${id}/submit`);
        expect(response.status(), `envio sem ${campo}`).toBe(400);
        expect(await response.text()).toContain(mensagem);
      }
    });

    test('exige exatamente um responsável financeiro', async ({ request }) => {
      const { id } = await completeDraft(request, 'financeiro');
      const guardian = {
        name: 'Marta API',
        phone: '31988887777',
        cpf: '11122233344',
        isFinancialResponsible: true,
      };

      for (const guardians of [
        [{ ...guardian, isFinancialResponsible: false }],
        [guardian, { ...guardian, name: 'João API' }],
      ]) {
        await request.patch(`${API}/signup-links/${id}`, { data: { guardians } });
        const response = await request.post(`${API}/signup-links/${id}/submit`);
        expect(response.status()).toBe(400);
        expect(await response.text()).toContain('exatamente um responsável financeiro');
      }
    });

    test('recusa e-mail que já é de outro usuário', async ({ request }) => {
      const { id } = await completeDraft(request, 'email-repetido');
      await request.patch(`${API}/signup-links/${id}`, {
        data: { studentEmail: 'aluno@teste.com' },
      });

      const response = await request.post(`${API}/signup-links/${id}/submit`);
      expect(response.status()).toBe(409);
      expect(await response.text()).toContain('Já existe um usuário com este e-mail');
    });
  });

  test.describe('aprovação', () => {
    test('só aprova o que está aguardando', async ({ request }) => {
      const headers = await adminHeaders(request);
      const { id } = await completeDraft(request, 'ainda-pendente');

      /* Ainda pendente: o aluno nem enviou. */
      const pendente = await request.post(`${API}/signup-links/${id}/approve`, {
        headers,
        data: {},
      });
      expect(pendente.status()).toBe(400);
      expect(await pendente.text()).toContain('não está aguardando aprovação');

      await request.post(`${API}/signup-links/${id}/submit`);
      const aprovado = await request.post(`${API}/signup-links/${id}/approve`, {
        headers,
        data: {},
      });
      expect(aprovado.status(), await aprovado.text()).toBe(201);
      const { studentId } = (await aprovado.json()) as { studentId: string };

      /* Aprovar de novo não cria um segundo aluno. */
      const repetido = await request.post(`${API}/signup-links/${id}/approve`, {
        headers,
        data: {},
      });
      expect(repetido.status()).toBe(400);

      await deactivate(request, studentId);
    });

    test('recusa desconto fora do formato', async ({ request }) => {
      const headers = await adminHeaders(request);
      const { id } = await completeDraft(request, 'desconto-ruim');
      await request.post(`${API}/signup-links/${id}/submit`);

      for (const discountPercentage of ['abc', '150', '-5', '10.999']) {
        const response = await request.post(`${API}/signup-links/${id}/approve`, {
          headers,
          data: { discountPercentage },
        });
        expect(response.status(), `desconto ${discountPercentage}`).toBe(400);
      }

      /* E o cadastro continua intacto, esperando uma aprovação válida. */
      const waiting = (await (
        await request.get(`${API}/signup-links/waiting`, { headers })
      ).json()) as { id: string }[];
      expect(waiting.some((item) => item.id === id)).toBe(true);
    });

    test('e-mail tomado entre o envio e a aprovação não vira aluno pela metade', async ({
      request,
    }) => {
      const headers = await adminHeaders(request);

      /* Dois cadastros com o mesmo e-mail: o primeiro aprovado toma o e-mail. */
      const primeiro = await completeDraft(request, 'corrida-a');
      const segundo = await completeDraft(request, 'corrida-b');
      await request.patch(`${API}/signup-links/${segundo.id}`, {
        data: { studentEmail: primeiro.email },
      });
      await request.post(`${API}/signup-links/${primeiro.id}/submit`);
      await request.post(`${API}/signup-links/${segundo.id}/submit`);

      const antes = (await (
        await request.get(`${API}/students/all`, { headers })
      ).json()) as unknown[];

      const ok = await request.post(`${API}/signup-links/${primeiro.id}/approve`, {
        headers,
        data: {},
      });
      expect(ok.status()).toBe(201);
      const { studentId } = (await ok.json()) as { studentId: string };

      const conflito = await request.post(`${API}/signup-links/${segundo.id}/approve`, {
        headers,
        data: {},
      });
      expect(conflito.status()).toBe(409);

      /* A transação voltou inteira: só o primeiro virou aluno. */
      const depois = (await (
        await request.get(`${API}/students/all`, { headers })
      ).json()) as unknown[];
      expect(depois.length).toBe(antes.length + 1);

      await deactivate(request, studentId);
    });
  });

  test.describe('o que a aprovação cria', () => {
    test('aluno, responsável, contrato e primeira parcela, com desconto', async ({ request }) => {
      const headers = await adminHeaders(request);
      const { id, planId } = await completeDraft(request, 'criacao');
      await request.post(`${API}/signup-links/${id}/submit`);

      const { studentId } = (await (
        await request.post(`${API}/signup-links/${id}/approve`, {
          headers,
          data: { discountPercentage: '25' },
        })
      ).json()) as { studentId: string };

      const detail = (await (
        await request.get(`${API}/students/${studentId}`, { headers })
      ).json()) as {
        name: string;
        active: boolean;
        guardians: { name: string; isFinancialResponsible: boolean }[];
        contracts: {
          planId: string;
          status: string;
          startDate: string;
          endDate: string | null;
          discountPercentage: string;
        }[];
      };

      expect(detail.active).toBe(true);
      expect(detail.guardians).toHaveLength(1);
      expect(detail.guardians[0].isFinancialResponsible).toBe(true);
      expect(detail.contracts).toHaveLength(1);
      expect(detail.contracts[0].planId).toBe(planId);
      expect(detail.contracts[0].status).toBe('active');
      expect(detail.contracts[0].discountPercentage).toBe('25.00');
      /* Prata vai até dezembro do ano de início. */
      expect(detail.contracts[0].endDate).toBe(
        `${detail.contracts[0].startDate.slice(0, 4)}-12-31`,
      );

      const pricing = (await (await request.get(`${API}/regions/pricing`, { headers })).json()) as {
        plans: { id: string; monthlyPrice: string }[];
      }[];
      const plan = pricing.flatMap((region) => region.plans).find((item) => item.id === planId)!;

      const payments = (await (
        await request.get(`${API}/students/${studentId}/payments`, { headers })
      ).json()) as { amount: string; dueDate: string; status: string }[];
      expect(payments).toHaveLength(1);
      expect(payments[0].amount).toBe((Number(plan.monthlyPrice) * 0.75).toFixed(2));
      expect(payments[0].status).toBe('pending');
      expect(payments[0].dueDate.endsWith('-10'), 'vencimento no dia 10').toBe(true);

      /* O aluno entra no sistema com a senha que ele mesmo escolheu. */
      const login = await request.post(`${API}/auth/login`, {
        data: { email: `api.criacao.${STAMP}@teste.com`, password: 'senha123', role: 'student' },
      });
      expect(login.status(), 'login do aluno novo').toBe(201);

      const errado = await request.post(`${API}/auth/login`, {
        data: { email: `api.criacao.${STAMP}@teste.com`, password: 'errada', role: 'student' },
      });
      expect(errado.status(), 'senha errada').toBe(401);

      await deactivate(request, studentId);
    });

    test('sem desconto a parcela é o preço cheio', async ({ request }) => {
      const headers = await adminHeaders(request);
      const { id, planId } = await completeDraft(request, 'sem-desconto');
      await request.post(`${API}/signup-links/${id}/submit`);

      const { studentId } = (await (
        await request.post(`${API}/signup-links/${id}/approve`, { headers, data: {} })
      ).json()) as { studentId: string };

      const pricing = (await (await request.get(`${API}/regions/pricing`, { headers })).json()) as {
        plans: { id: string; monthlyPrice: string }[];
      }[];
      const plan = pricing.flatMap((region) => region.plans).find((item) => item.id === planId)!;

      const payments = (await (
        await request.get(`${API}/students/${studentId}/payments`, { headers })
      ).json()) as { amount: string }[];
      expect(payments[0].amount).toBe(Number(plan.monthlyPrice).toFixed(2));

      const detail = (await (
        await request.get(`${API}/students/${studentId}`, { headers })
      ).json()) as { contracts: { discountPercentage: string | null }[] };
      expect(detail.contracts[0].discountPercentage).toBeNull();

      await deactivate(request, studentId);
    });

    /* A avulsa não tem mensalidade: a parcela é apurada pelas aulas do mês. */
    test('plano avulso nasce com parcela zerada', async ({ request }) => {
      const headers = await adminHeaders(request);
      const { id, regionId } = await completeDraft(request, 'avulsa');

      const form = (await (await request.get(`${API}/regions/pricing`, { headers })).json()) as {
        id: string;
        plans: { id: string; planType: string }[];
      }[];
      const avulsa = form
        .find((region) => region.id === regionId)!
        .plans.find((plan) => plan.planType === 'avulsa')!;

      await request.patch(`${API}/signup-links/${id}`, { data: { planId: avulsa.id } });
      await request.post(`${API}/signup-links/${id}/submit`);

      const { studentId } = (await (
        await request.post(`${API}/signup-links/${id}/approve`, { headers, data: {} })
      ).json()) as { studentId: string };

      const detail = (await (
        await request.get(`${API}/students/${studentId}`, { headers })
      ).json()) as { contracts: { planType: string; endDate: string | null }[] };
      expect(detail.contracts[0].planType).toBe('avulsa');
      /* Avulsa não tem vigência. */
      expect(detail.contracts[0].endDate).toBeNull();

      const payments = (await (
        await request.get(`${API}/students/${studentId}/payments`, { headers })
      ).json()) as { amount: string }[];
      expect(payments[0].amount).toBe('0.00');

      await deactivate(request, studentId);
    });

    /* Bronze é pacote: parcela única e vigência pela validade em meses. */
    test('plano bronze nasce com vigência pela validade do pacote', async ({ request }) => {
      const headers = await adminHeaders(request);
      const { id, regionId } = await completeDraft(request, 'bronze');

      const pricing = (await (await request.get(`${API}/regions/pricing`, { headers })).json()) as {
        id: string;
        plans: { id: string; planType: string; validityMonths: number | null }[];
      }[];
      const bronze = pricing
        .find((region) => region.id === regionId)!
        .plans.find((plan) => plan.planType === 'bronze')!;

      await request.patch(`${API}/signup-links/${id}`, { data: { planId: bronze.id } });
      await request.post(`${API}/signup-links/${id}/submit`);

      const { studentId } = (await (
        await request.post(`${API}/signup-links/${id}/approve`, { headers, data: {} })
      ).json()) as { studentId: string };

      const detail = (await (
        await request.get(`${API}/students/${studentId}`, { headers })
      ).json()) as { contracts: { planType: string; startDate: string; endDate: string }[] };
      const { startDate, endDate } = detail.contracts[0];
      const meses =
        (Number(endDate.slice(0, 4)) - Number(startDate.slice(0, 4))) * 12 +
        Number(endDate.slice(5, 7)) -
        Number(startDate.slice(5, 7));
      expect(detail.contracts[0].planType).toBe('bronze');
      expect(meses).toBe(bronze.validityMonths);

      await deactivate(request, studentId);
    });
  });

  /* O aluno criado aqui tem que servir ao resto do sistema como qualquer outro. */
  test('aluno aprovado já pode receber aula na agenda', async ({ request }) => {
    const headers = await adminHeaders(request);
    const { id } = await completeDraft(request, 'agenda');
    await request.post(`${API}/signup-links/${id}/submit`);
    const { studentId } = (await (
      await request.post(`${API}/signup-links/${id}/approve`, { headers, data: {} })
    ).json()) as { studentId: string };

    const options = (await (
      await request.get(`${API}/classes/form-options`, { headers })
    ).json()) as {
      teachers: { id: string; subjects: { id: string }[] }[];
      students: { id: string }[];
    };
    expect(options.students.some((item) => item.id === studentId)).toBe(true);

    /*
     * Daqui a uma semana, às 7h: dentro da vigência do contrato e longe do
     * "hoje" que as outras suítes usam, então não disputa horário com elas.
     */
    const detail = (await (
      await request.get(`${API}/students/${studentId}`, { headers })
    ).json()) as { contracts: { endDate: string }[] };
    const alvo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const dia = [
      alvo.getFullYear(),
      String(alvo.getMonth() + 1).padStart(2, '0'),
      String(alvo.getDate()).padStart(2, '0'),
    ].join('-');
    const dentroDaVigencia = dia > detail.contracts[0].endDate ? detail.contracts[0].endDate : dia;

    const created = await request.post(`${API}/classes`, {
      headers,
      data: {
        studentId,
        teacherId: options.teachers[0].id,
        subjectId: options.teachers[0].subjects[0].id,
        scheduledAt: `${dentroDaVigencia}T07:00`,
        durationMinutes: 60,
        locationType: 'school',
      },
    });
    expect(created.status(), await created.text()).toBe(201);

    const aula = (await created.json()) as { id: string };
    await request.patch(`${API}/classes/${aula.id}/cancel`, { headers });
    await deactivate(request, studentId);
  });
});
