import { expect, login, test } from './helpers';

/* Porta de entrada: cada papel entra na própria tela e ninguém entra na do outro. */
test.describe('login', () => {
  test('admin entra e cai no painel', async ({ page }) => {
    await login(page, 'admin');

    await expect(page).toHaveURL(/\/painel$/);
    await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
  });

  test('professor entra e cai na agenda', async ({ page }) => {
    await login(page, 'professor');

    await expect(page).toHaveURL(/\/agenda$/);
    await expect(page.getByText('Suas aulas e horários')).toBeVisible();
  });

  test('aluno entra e cai na agenda', async ({ page }) => {
    await login(page, 'student');

    await expect(page).toHaveURL(/\/agenda$/);
    await expect(page.getByRole('link', { name: 'Meu plano' })).toBeVisible();
  });

  test('senha errada mostra erro e não entra', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await page.locator('#email').fill('admin@teste.com');
    await page.locator('#password').fill('senha-errada');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('papel errado para a mesma conta é recusado', async ({ page }) => {
    await page.goto('/login');
    /* Credenciais do admin, mas entrando como aluno. */
    await page.getByRole('button', { name: 'Aluno', exact: true }).click();
    await page.locator('#email').fill('admin@teste.com');
    await page.locator('#password').fill('teste123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();
  });

  test('valida e-mail e senha antes de chamar a API', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('nao-e-email');
    await page.locator('#password').fill('123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('E-mail inválido.')).toBeVisible();
    await expect(page.getByText('A senha deve ter ao menos 6 caracteres.')).toBeVisible();
  });

  test('sem sessão, url interna volta para o login', async ({ page }) => {
    await page.goto('/alunos');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('aluno não abre tela de admin', async ({ page }) => {
    await login(page, 'student');
    await page.goto('/alunos');

    await expect(page).toHaveURL(/\/agenda$/);
  });

  test('professor não abre tela de admin', async ({ page }) => {
    await login(page, 'professor');
    await page.goto('/painel');

    await expect(page).toHaveURL(/\/agenda$/);
  });

  test('admin não abre tela de professor', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/ganhos');

    await expect(page).toHaveURL(/\/painel$/);
  });

  test('sair encerra a sessão', async ({ page }) => {
    await login(page, 'admin');
    await expect(page).toHaveURL(/\/painel$/);

    await page.getByRole('button', { name: 'Sair' }).click();

    await expect(page).toHaveURL(/\/login$/);
    /* Voltar não deve reabrir a área logada. */
    await page.goto('/painel');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('quem já está logado não volta ao login pela url', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/login');

    await expect(page).toHaveURL(/\/painel$/);
  });
});
