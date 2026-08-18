import {
  baseHour,
  ensureScheduledClass,
  expect,
  freeSlot,
  hhmm,
  login,
  test,
  today,
} from './helpers';
import type { Page } from '@playwright/test';

/*
 * Agenda: agendar, ver na grade, encerrar e cancelar. É onde nasce todo o
 * dinheiro do sistema — a aula concluída é o que vira receita e comissão.
 *
 * Cada teste usa um horário próprio para não brigar com os outros pela regra
 * de conflito, sempre hoje, para a aula cair na grade visível.
 */

const HORA = {
  criar: baseHour() + 1,
  conflito: baseHour() + 2,
  cancelar: baseHour() + 3,
  /* Uma hora antes da atual: já começou, então pode ser encerrada. */
  encerrar: Math.max(0, baseHour() - 1),
};

/*
 * A grade não expõe o status da aula em texto — só na cor. Para escolher a aula
 * certa quando o mesmo horário tem uma cancelada e uma agendada, o seletor usa
 * a classe de cor de cada status (ver CLASS_STATUS_DISPLAY).
 */
const COR = {
  agendada: 'bg-subject-blue/15',
  realizada: 'bg-subject-green/15',
  cancelada: 'bg-subject-amber/15',
};

function aulaNaGrade(page: Page, hour: number, status: keyof typeof COR) {
  return page
    .locator(`app-calendar-grid button[class*="${COR[status]}"]`, { hasText: hhmm(hour) })
    .first();
}

/** Abre a agenda no modo dia, onde a grade tem uma coluna só. */
async function abrirAgendaDeHoje(page: Page): Promise<void> {
  await login(page, 'admin');
  await page.getByRole('link', { name: 'Agenda' }).click();
  await expect(page).toHaveURL(/\/agenda$/);
  await page.getByRole('button', { name: 'Dia', exact: true }).click();
}

/** Preenche o formulário de nova aula e salva. */
async function agendar(page: Page, hour: number): Promise<void> {
  await page.getByRole('button', { name: 'Nova aula' }).click();
  const modal = page.getByRole('dialog');

  await modal.locator('#teacherId').selectOption({ label: 'Professor Teste' });
  await modal.locator('#studentId').selectOption({ label: 'Aluno Teste' });
  await modal.locator('#subjectId').selectOption({ label: 'Matemática' });
  await modal.locator('#date').fill(today());
  await modal.locator('#time').fill(hhmm(hour));
  await modal.getByRole('button', { name: 'Salvar' }).click();
}

test.describe('agenda', () => {
  test('admin agenda uma aula e ela aparece na grade no horário certo', async ({
    page,
    request,
  }) => {
    await freeSlot(request, HORA.criar);
    await abrirAgendaDeHoje(page);
    await agendar(page, HORA.criar);

    await expect(page.getByText('Aula agendada.')).toBeVisible();
    await expect(aulaNaGrade(page, HORA.criar, 'agendada')).toBeVisible();
  });

  test('detalhe da aula mostra aluno, matéria e local', async ({ page }) => {
    await abrirAgendaDeHoje(page);
    await aulaNaGrade(page, HORA.criar, 'agendada').click();

    const modal = page.getByRole('dialog');
    await expect(modal).toContainText('Aluno Teste');
    await expect(modal).toContainText('Matemática');
    await expect(modal).toContainText('Professor Teste');
    await expect(modal).toContainText('Agendada');
    await expect(modal).toContainText('No Cantinho');
  });

  test('recusa duas aulas no mesmo horário', async ({ page, request }) => {
    await freeSlot(request, HORA.conflito);
    await abrirAgendaDeHoje(page);
    await agendar(page, HORA.conflito);
    await expect(page.getByText('Aula agendada.')).toBeVisible();

    await agendar(page, HORA.conflito);

    await expect(page.getByText(/já tem uma aula nesse horário/)).toBeVisible();
  });

  test('cancelar a aula muda o status e libera o horário', async ({ page, request }) => {
    await freeSlot(request, HORA.cancelar);
    await abrirAgendaDeHoje(page);
    await agendar(page, HORA.cancelar);
    await expect(page.getByText('Aula agendada.')).toBeVisible();

    await aulaNaGrade(page, HORA.cancelar, 'agendada').click();
    const modal = page.getByRole('dialog');
    await modal.getByRole('button', { name: 'Cancelar aula' }).click();
    await expect(modal.getByText('Cancelar esta aula?')).toBeVisible();
    await modal.getByRole('button', { name: 'Cancelar aula' }).click();

    await expect(page.getByText('Aula cancelada.')).toBeVisible();
    await expect(aulaNaGrade(page, HORA.cancelar, 'cancelada')).toBeVisible();

    /* Horário liberado: agendar de novo no mesmo horário funciona. */
    await agendar(page, HORA.cancelar);
    await expect(page.getByText('Aula agendada.')).toBeVisible();
  });

  test('marcar realizada congela comissão e valor cobrado', async ({ page, request }) => {
    await ensureScheduledClass(request, HORA.encerrar);
    await abrirAgendaDeHoje(page);

    await aulaNaGrade(page, HORA.encerrar, 'agendada').click();
    const modal = page.getByRole('dialog');
    await modal.getByRole('button', { name: 'Marcar realizada' }).click();
    await expect(modal.getByText('Marcar esta aula como realizada?')).toBeVisible();
    await modal.getByRole('button', { name: 'Marcar realizada' }).click();

    await expect(page.getByText('Aula marcada como realizada.')).toBeVisible();

    /* Reabre o detalhe: os valores congelados aparecem para o admin, em reais. */
    await aulaNaGrade(page, HORA.encerrar, 'realizada').click();
    const detalhe = page.getByRole('dialog');
    await expect(detalhe).toContainText('Realizada');
    await expect(detalhe).toContainText(/R\$/);
    expect(await detalhe.textContent()).not.toContain('NaN');
  });

  test('aula encerrada não aceita editar, só reabrir', async ({ page }) => {
    await abrirAgendaDeHoje(page);
    await aulaNaGrade(page, HORA.encerrar, 'realizada').click();

    const modal = page.getByRole('dialog');
    await expect(modal).toContainText('Realizada');
    await expect(modal.getByRole('button', { name: 'Editar' })).toHaveCount(0);
    await expect(modal.getByRole('button', { name: 'Reabrir aula' })).toBeVisible();
  });

  test('professor não escolhe outro professor nem filtra a agenda alheia', async ({ page }) => {
    await login(page, 'professor');
    await page.getByRole('button', { name: 'Dia', exact: true }).click();

    await page.getByRole('button', { name: 'Nova aula' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.locator('#teacherId')).toHaveCount(0);
    await expect(modal.locator('#studentId')).toBeVisible();
    await modal.getByRole('button', { name: 'Cancelar' }).click();

    await expect(page.getByLabel('Filtrar por professor')).toHaveCount(0);
  });

  test('aluno não agenda: recebe o aviso em vez do formulário', async ({ page }) => {
    await login(page, 'student');
    await page.getByRole('button', { name: 'Nova aula' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toContainText('Alunos não marcam aulas pelo sistema');
    await expect(modal.locator('#studentId')).toHaveCount(0);
  });

  test('aluno vê a própria aula na agenda', async ({ page }) => {
    await login(page, 'student');
    await page.getByRole('button', { name: 'Dia', exact: true }).click();

    await expect(aulaNaGrade(page, HORA.criar, 'agendada')).toBeVisible();
  });

  test('navegar entre períodos não quebra a agenda', async ({ page }) => {
    await abrirAgendaDeHoje(page);

    await page.getByRole('button', { name: 'Próximo período' }).click();
    await page.getByRole('button', { name: 'Próximo período' }).click();
    await page.getByRole('button', { name: 'Período anterior' }).click();
    await page.getByRole('button', { name: 'Hoje' }).click();

    await expect(page.getByText('Não foi possível carregar a agenda.')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Semana', exact: true })).toBeVisible();
  });
});
