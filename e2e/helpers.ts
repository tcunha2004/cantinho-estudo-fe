import { APIRequestContext, expect, Page, test as base } from '@playwright/test';

/* A API que o app conversa — a mesma de src/app/service/api.config.ts. */
export const API = 'http://localhost:3000';

export const PASSWORD = 'teste123';

export type Role = 'admin' | 'professor' | 'student';

const EMAIL: Record<Role, string> = {
  admin: 'admin@teste.com',
  professor: 'prof@teste.com',
  student: 'aluno@teste.com',
};

const ROLE_BUTTON: Record<Role, string> = {
  admin: 'Admin',
  professor: 'Professor',
  student: 'Aluno',
};

/*
 * `test` com rede de segurança: qualquer exceção não tratada ou console.error
 * derruba o teste, mesmo que a asserção não tenha pedido. É o que pega o bug
 * que ninguém pensou em conferir.
 *
 * Fica fora o ruído de rede do próprio navegador ("Failed to load resource"),
 * que aparece nos testes que provocam 401/409 de propósito.
 */
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const problems: string[] = [];

    page.on('pageerror', (error) => problems.push(`exceção: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().includes('Failed to load resource')) {
        problems.push(`console: ${message.text()}`);
      }
    });

    await use(page);

    expect(problems, 'erros de JavaScript na página').toEqual([]);
  },
});

/** Entra no sistema pela tela de login, como o usuário faria. */
export async function login(page: Page, role: Role): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: ROLE_BUTTON[role], exact: true }).click();
  await page.locator('#email').fill(EMAIL[role]);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();

  /* Espera a sessão existir de fato: sem isso, navegar em seguida corre contra
   * o POST /auth/login e a guarda joga o usuário no login. */
  await expect(page).not.toHaveURL(/\/login$/);
}

/** Token da API para preparar dados sem passar pela tela. */
export async function token(request: APIRequestContext, role: Role): Promise<string> {
  const response = await request.post(`${API}/auth/login`, {
    data: { email: EMAIL[role], password: PASSWORD, role },
  });
  expect(response.status(), 'login na API').toBe(201);
  return ((await response.json()) as { access_token: string }).access_token;
}

export async function adminHeaders(
  request: APIRequestContext,
): Promise<{ Authorization: string }> {
  return { Authorization: `Bearer ${await token(request, 'admin')}` };
}

/** Ids do professor, aluno e matéria do seed. */
export async function seedIds(request: APIRequestContext): Promise<{
  teacherId: string;
  studentId: string;
  subjectId: string;
}> {
  const headers = await adminHeaders(request);
  const response = await request.get(`${API}/classes/form-options`, { headers });
  const body = (await response.json()) as {
    teachers: { id: string; subjects: { id: string }[] }[];
    students: { id: string }[];
  };

  expect(body.teachers.length, 'seed sem professor — rode `npm run seed`').toBeGreaterThan(0);
  expect(body.students.length, 'seed sem aluno — rode `npm run seed`').toBeGreaterThan(0);

  return {
    teacherId: body.teachers[0].id,
    studentId: body.students[0].id,
    subjectId: body.teachers[0].subjects[0].id,
  };
}

/*
 * Hora base dos testes: a hora cheia atual, limitada a 20h para sobrar espaço
 * para horários futuros no mesmo dia. Aula na hora base já começou (pode ser
 * encerrada); base + 1 e base + 2 ainda estão por vir.
 */
export function baseHour(): number {
  return Math.min(new Date().getHours(), 20);
}

export function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function hhmm(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/*
 * Garante que existe uma aula naquele horário de hoje, criando ou reaproveitando
 * a que já está lá. Reaproveitar deixa a suíte re-executável sem precisar de
 * seed a cada rodada — o horário é único por teste, não por execução.
 */
export async function ensureClass(
  request: APIRequestContext,
  options: { hour: number; durationMinutes?: number; locationType?: 'school' | 'home' },
): Promise<{ id: string; status: string }> {
  const { teacherId, studentId, subjectId } = await seedIds(request);
  const headers = await adminHeaders(request);
  const scheduledAt = `${today()}T${hhmm(options.hour)}`;

  const created = await request.post(`${API}/classes`, {
    headers,
    data: {
      studentId,
      teacherId,
      subjectId,
      scheduledAt,
      durationMinutes: options.durationMinutes ?? 60,
      locationType: options.locationType ?? 'school',
    },
  });

  if (created.status() === 201) {
    return (await created.json()) as { id: string; status: string };
  }

  expect(created.status(), await created.text()).toBe(409);

  const agenda = (await (
    await request.get(`${API}/classes/agenda`, {
      headers,
      params: { from: today(), to: today() },
    })
  ).json()) as { id: string; scheduledAt: string; status: string }[];

  const existente = agenda.find((item) => item.scheduledAt === `${scheduledAt}:00`);
  expect(existente, `nenhuma aula reaproveitável em ${scheduledAt}`).toBeTruthy();

  return existente!;
}

/*
 * Libera o horário: cancela o que estiver marcado ali. Deixa os testes que
 * agendam pela tela rodarem de novo sem precisar de seed — aula cancelada não
 * bloqueia horário.
 */
export async function freeSlot(request: APIRequestContext, hour: number): Promise<void> {
  const headers = await adminHeaders(request);
  const alvo = `${today()}T${hhmm(hour)}:00`;

  const agenda = (await (
    await request.get(`${API}/classes/agenda`, {
      headers,
      params: { from: today(), to: today() },
    })
  ).json()) as { id: string; scheduledAt: string; status: string }[];

  for (const item of agenda) {
    if (item.scheduledAt !== alvo || item.status === 'cancelled') {
      continue;
    }

    if (item.status !== 'scheduled') {
      await request.patch(`${API}/classes/${item.id}/reopen`, { headers });
    }
    const response = await request.patch(`${API}/classes/${item.id}/cancel`, { headers });
    expect(response.status(), await response.text()).toBe(200);
  }
}

/** Aula agendada (não encerrada) naquele horário — reabre se preciso. */
export async function ensureScheduledClass(
  request: APIRequestContext,
  hour: number,
): Promise<{ id: string }> {
  const aula = await ensureClass(request, { hour });

  if (aula.status !== 'scheduled') {
    const headers = await adminHeaders(request);
    const response = await request.patch(`${API}/classes/${aula.id}/reopen`, { headers });
    expect(response.status(), await response.text()).toBe(200);
  }

  return aula;
}

/** Aula concluída naquele horário — congela comissão e valor cobrado. */
export async function ensureCompletedClass(
  request: APIRequestContext,
  hour: number,
): Promise<{ id: string }> {
  const aula = await ensureClass(request, { hour });

  if (aula.status === 'scheduled') {
    const headers = await adminHeaders(request);
    const response = await request.patch(`${API}/classes/${aula.id}/complete`, { headers });
    expect(response.status(), await response.text()).toBe(200);
  }

  return aula;
}

/** Reativa aluno ou professor depois dos testes de inativação. */
export async function reactivate(
  request: APIRequestContext,
  kind: 'students' | 'teachers',
  id: string,
): Promise<void> {
  const headers = await adminHeaders(request);
  const response = await request.patch(`${API}/${kind}/${id}`, {
    headers,
    data: { active: true },
  });
  expect(response.status(), await response.text()).toBe(200);
}

export { expect };
