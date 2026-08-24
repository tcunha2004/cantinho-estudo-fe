import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../service/api.config';
import { NewContractModal } from './new-contract-modal';

/*
 * O começo do contrato. Gerar não cria aluno nenhum — cria só o link que o
 * aluno vai preencher. O que importa aqui é o link certo chegar à área de
 * transferência do admin.
 */
describe('NewContractModal', () => {
  let fixture: ComponentFixture<NewContractModal>;
  let http: HttpTestingController;
  let copied: string[];

  /* jsdom não implementa <dialog>.showModal() nem a área de transferência. */
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    };
  });

  beforeEach(() => {
    copied = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (value: string) => {
          copied.push(value);
          return Promise.resolve();
        },
      },
    });

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(NewContractModal);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function click(label: string): void {
    const button = [...host().querySelectorAll('button')].find(
      (item) => item.textContent?.trim() === label,
    );
    expect(button, `botão "${label}" não encontrado`).toBeTruthy();
    button!.click();
    fixture.detectChanges();
  }

  function fillEmail(value: string): void {
    const input = host().querySelector('#linkStudentEmail') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  async function generate(): Promise<void> {
    fillEmail('ana@teste.com');
    click('Gerar');
    const request = http.expectOne(`${API_BASE_URL}/signup-links`);
    expect(request.request.body).toEqual({ studentEmail: 'ana@teste.com' });
    request.flush({ id: 'link-1' });
    await Promise.resolve();
    fixture.detectChanges();
  }

  it('explica o fluxo antes de gerar', () => {
    expect(host().textContent).toContain('aparece nas suas notificações');
    expect(host().querySelector('#linkStudentEmail')).toBeTruthy();
  });

  it('cancelar não cria link nenhum', () => {
    click('Cancelar');
    http.expectNone(`${API_BASE_URL}/signup-links`);
  });

  /* Sem e-mail não há aluno para identificar o link — nem requisição. */
  it('não gera sem e-mail', () => {
    click('Gerar');
    http.expectNone(`${API_BASE_URL}/signup-links`);
  });

  it('gerar cria o link e mostra a URL do cadastro', async () => {
    await generate();

    const input = host().querySelector('input') as HTMLInputElement;
    expect(input.value).toBe(`${window.location.origin}/cadastro/link-1`);
  });

  it('copia o link para a área de transferência', async () => {
    await generate();

    const copy = host().querySelector('[aria-label="Copiar link"]') as HTMLButtonElement;
    copy.click();
    await Promise.resolve();
    fixture.detectChanges();

    expect(copied).toEqual([`${window.location.origin}/cadastro/link-1`]);
    expect(host().textContent).toContain('Link copiado');
  });

  it('avisa quando não consegue gerar', async () => {
    fillEmail('ana@teste.com');
    click('Gerar');
    http
      .expectOne(`${API_BASE_URL}/signup-links`)
      .flush({ message: 'erro' }, { status: 500, statusText: 'erro' });
    await Promise.resolve();
    fixture.detectChanges();

    expect(host().textContent).toContain('Não foi possível gerar o link');
  });

  /* 409 é o e-mail que já é de um usuário — erro do admin, não falha de rede. */
  it('distingue e-mail já cadastrado de falha genérica', async () => {
    fillEmail('ana@teste.com');
    click('Gerar');
    http
      .expectOne(`${API_BASE_URL}/signup-links`)
      .flush({ message: 'conflito' }, { status: 409, statusText: 'conflito' });
    await Promise.resolve();
    fixture.detectChanges();

    expect(host().textContent).toContain('Já existe um usuário com este e-mail');
  });
});
