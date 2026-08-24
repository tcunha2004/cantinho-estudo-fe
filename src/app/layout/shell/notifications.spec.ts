import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../service/api.config';
import { Notifications } from './notifications';

/*
 * O sino do admin. É por aqui que um cadastro enviado vira aluno ou professor
 * ativo, então o que este teste protege é o corpo da aprovação (o desconto, que
 * só aluno tem), as duas conferências e o fato de a contagem refletir o que
 * ainda está esperando.
 */

const waiting = {
  role: 'student',
  id: 'link-1',
  studentName: 'Ana Souza',
  studentEmail: 'ana@teste.com',
  studentPhone: '(31) 90000-0000',
  studentAddress: null,
  regionName: 'Vila da Serra',
  enrollmentFee: '200.00',
  planId: 'plano-ouro',
  planType: 'ouro',
  frequency: 3,
  monthlyPrice: '1000.00',
  hourPrice: '100.00',
  classesCount: 12,
  validityMonths: null,
  guardians: [
    {
      name: 'Marta Souza',
      phone: '(31) 98888-7777',
      cpf: '111.222.333-44',
      rg: null,
      isFinancialResponsible: true,
    },
  ],
  submittedAt: '2026-08-20T10:00:00',
};

const waitingTeacher = {
  role: 'professor',
  id: 'link-2',
  studentName: 'Carlos Lima',
  studentEmail: 'carlos@teste.com',
  bio: 'Licenciado em Matemática, 10 anos de sala de aula.',
  subjects: [{ id: 'sub-1', name: 'Matemática' }],
  submittedAt: '2026-08-21T10:00:00',
};

describe('Notifications', () => {
  let fixture: ComponentFixture<Notifications>;
  let http: HttpTestingController;

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
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function tick(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  }

  async function open(items: object[] = [waiting]): Promise<void> {
    fixture = TestBed.createComponent(Notifications);
    fixture.detectChanges();
    http.expectOne(`${API_BASE_URL}/signup-links/waiting`).flush(items);
    await tick();
  }

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function text(): string {
    return host().textContent ?? '';
  }

  function click(label: string): void {
    const button = [...host().querySelectorAll('button')].find((item) =>
      item.textContent?.trim().startsWith(label),
    );
    expect(button, `botão "${label}" não encontrado`).toBeTruthy();
    button!.click();
    fixture.detectChanges();
  }

  function openModal(): void {
    (host().querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('mostra a contagem de cadastros aguardando', async () => {
    await open();

    expect(host().querySelector('[aria-label="1 cadastro aguardando aprovação"]')).toBeTruthy();
    expect(text()).toContain('1');
  });

  it('sem cadastros aguardando não mostra número', async () => {
    await open([]);

    expect(host().querySelector('[aria-label="0 cadastros aguardando aprovação"]')).toBeTruthy();
    expect(text().trim()).toBe('');
  });

  it('lista os cadastros e a lista vazia se explica', async () => {
    await open();
    openModal();

    expect(text()).toContain('Ana Souza');
    expect(text()).toContain('Vila da Serra');
    expect(text()).toContain('Ouro');
  });

  it('selecionar um cadastro mostra os dados enviados', async () => {
    await open();
    openModal();
    click('Ana Souza');

    expect(text()).toContain('ana@teste.com');
    expect(text()).toContain('Marta Souza');
    expect(text()).toContain('Financeiro');
    /* A taxa de matrícula é informativa: cobrada fora do sistema. */
    expect(text()).toContain('cobrada fora do sistema');
  });

  it('o desconto digitado entra no corpo da aprovação', async () => {
    await open();
    openModal();
    click('Ana Souza');

    const discount = host().querySelector('#discountPercentage') as HTMLInputElement;
    discount.value = '10';
    discount.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    click('Confirmar e gerar contrato');

    const request = http.expectOne(`${API_BASE_URL}/signup-links/link-1/approve`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ discountPercentage: '10' });
    request.flush({ id: 's1' });
    await tick();

    /* Volta para a lista, agora vazia, e recarrega a contagem. */
    http.expectOne(`${API_BASE_URL}/signup-links/waiting`).flush([]);
    await tick();

    expect(text()).toContain('Ana Souza agora está ativo');
    expect(text()).toContain('Nenhum cadastro aguardando');
  });

  it('sem desconto o corpo vai nulo', async () => {
    await open();
    openModal();
    click('Ana Souza');
    click('Confirmar e gerar contrato');

    const request = http.expectOne(`${API_BASE_URL}/signup-links/link-1/approve`);
    expect(request.request.body).toEqual({ discountPercentage: null });
    request.flush({ id: 's1' });
    await tick();

    http.expectOne(`${API_BASE_URL}/signup-links/waiting`).flush([]);
    await tick();
  });

  /* Professor não tem plano, região nem desconto — a conferência é outra. */
  it('conferência de professor mostra matérias e apresentação, sem desconto', async () => {
    await open([waitingTeacher]);
    openModal();

    expect(text()).toContain('Professor');
    click('Carlos Lima');

    expect(text()).toContain('carlos@teste.com');
    expect(text()).toContain('Matemática');
    expect(text()).toContain('10 anos de sala de aula');
    expect(host().querySelector('#discountPercentage')).toBeNull();
  });

  it('aprovar professor não manda desconto', async () => {
    await open([waitingTeacher]);
    openModal();
    click('Carlos Lima');
    click('Confirmar e liberar acesso');

    const request = http.expectOne(`${API_BASE_URL}/signup-links/link-2/approve`);
    expect(request.request.body).toEqual({ discountPercentage: null });
    request.flush({ id: 't1' });
    await tick();

    http.expectOne(`${API_BASE_URL}/signup-links/waiting`).flush([]);
    await tick();

    expect(text()).toContain('Carlos Lima agora está ativo');
  });

  it('erro na aprovação aparece sem sair da conferência', async () => {
    await open();
    openModal();
    click('Ana Souza');
    click('Confirmar e gerar contrato');

    http
      .expectOne(`${API_BASE_URL}/signup-links/link-1/approve`)
      .flush(
        { message: 'Já existe um usuário com este e-mail' },
        { status: 409, statusText: 'conflito' },
      );
    await tick();

    expect(text()).toContain('Já existe um usuário com este e-mail');
    expect(text()).toContain('Confirmar e gerar contrato');
  });
});
