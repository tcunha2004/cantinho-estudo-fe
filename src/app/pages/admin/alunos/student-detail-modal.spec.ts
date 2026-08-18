import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../service/api.config';
import { StudentDetailModal } from './student-detail-modal';

/*
 * O modal é o único lugar do sistema onde o admin edita um aluno: dados
 * cadastrais, contrato atual e responsável. O que importa aqui é o corpo do
 * PATCH — é ele que o backend transforma em contrato novo, desconto e cobrança.
 */

const student = {
  id: 's1',
  name: 'Ana Souza',
  email: 'ana@teste.com',
  phone: '(31) 90000-0000',
  address: null,
  active: true,
  region: { id: 'r-vila', name: 'Vila da Serra' },
  guardians: [
    {
      name: 'Marta Souza',
      phone: '(31) 98888-7777',
      cpf: '111.222.333-44',
      isFinancialResponsible: true,
    },
  ],
  contracts: [
    {
      id: 'c1',
      planId: 'plano-vila-ouro',
      planType: 'ouro',
      frequency: 3,
      status: 'active',
      startDate: '2026-08-01',
      endDate: null,
      discountPercentage: '10.00',
    },
  ],
};

const pricing = [
  {
    id: 'r-vila',
    name: 'Vila da Serra',
    slug: 'vila-da-serra',
    enrollmentFee: '150.00',
    classCommission: '35.00',
    plans: [
      {
        id: 'plano-vila-ouro',
        planType: 'ouro',
        frequency: 3,
        monthlyPrice: '900.00',
        hourPrice: '75.00',
        classesCount: 12,
        validityMonths: 1,
      },
      {
        id: 'plano-vila-prata',
        planType: 'prata',
        frequency: null,
        monthlyPrice: '600.00',
        hourPrice: '65.00',
        classesCount: 8,
        validityMonths: 1,
      },
    ],
  },
  {
    id: 'r-cantinho',
    name: 'Cantinho',
    slug: 'cantinho',
    enrollmentFee: '100.00',
    classCommission: '25.00',
    plans: [
      {
        id: 'plano-cantinho-ouro',
        planType: 'ouro',
        frequency: 3,
        monthlyPrice: '720.00',
        hourPrice: '60.00',
        classesCount: 12,
        validityMonths: 1,
      },
    ],
  },
];

describe('StudentDetailModal', () => {
  let fixture: ComponentFixture<StudentDetailModal>;
  let http: HttpTestingController;

  /* jsdom não implementa <dialog>.showModal(); o modal só precisa não estourar. */
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
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  /* Sinais de rxResource chegam num microtask; roda a fila e re-renderiza. */
  async function tick(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  }

  /* Abre o modal já com aluno e tabela de preços carregados. */
  async function open(detail: object = student): Promise<void> {
    fixture = TestBed.createComponent(StudentDetailModal);
    fixture.componentRef.setInput('studentId', 's1');
    fixture.detectChanges();

    http.expectOne(`${API_BASE_URL}/regions/pricing`).flush(pricing);
    http.expectOne(`${API_BASE_URL}/students/s1`).flush(detail);
    await tick();
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function click(label: string): void {
    const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (item) => item.textContent?.trim() === label,
    );
    expect(button, `botão "${label}" não encontrado`).toBeTruthy();
    button!.click();
    fixture.detectChanges();
  }

  function field(selector: string): HTMLInputElement | HTMLSelectElement {
    const element = (fixture.nativeElement as HTMLElement).querySelector(selector);
    expect(element, `campo ${selector} não encontrado`).toBeTruthy();
    return element as HTMLInputElement | HTMLSelectElement;
  }

  function fill(selector: string, value: string): void {
    const element = field(selector);
    element.value = value;
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input'));
    fixture.detectChanges();
  }

  /* Depois de salvar, o modal recarrega o aluno — consome esse GET. */
  async function settleReload(detail: object = student): Promise<void> {
    await tick();
    for (const request of http.match(`${API_BASE_URL}/students/s1`)) {
      request.flush(detail);
    }
    await tick();
  }

  function submit(): void {
    (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('mostra os dados do aluno em modo leitura', async () => {
    await open();

    expect(text()).toContain('Ana Souza');
    expect(text()).toContain('ana@teste.com');
    expect(text()).toContain('Vila da Serra');
    expect(text()).toContain('Marta Souza');
    expect(text()).toContain('Ativo');
    /* Contrato atual aparece com o desconto. */
    expect(text()).toContain('Desconto: 10.00%');
  });

  it('pré-carrega o formulário com o que já está cadastrado', async () => {
    await open();
    click('Editar');

    expect(field('#name').value).toBe('Ana Souza');
    expect(field('#email').value).toBe('ana@teste.com');
    expect(field('#phone').value).toBe('(31) 90000-0000');
    expect(field('#regionId').value).toBe('r-vila');
    expect(field('#planId').value).toBe('plano-vila-ouro');
    expect(field('#discountPercentage').value).toBe('10.00');
    expect(field('#guardianName').value).toBe('Marta Souza');
    expect(field('#guardianCpf').value).toBe('111.222.333-44');
  });

  it('o select de plano só oferece planos da região escolhida', async () => {
    await open();
    click('Editar');

    const options = [...(fixture.nativeElement as HTMLElement).querySelectorAll('#planId option')];
    expect(options).toHaveLength(2);

    fill('#regionId', 'r-cantinho');

    expect(
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('#planId option')],
    ).toHaveLength(1);
  });

  it('envia cadastro, contrato e responsável num único PATCH', async () => {
    await open();
    click('Editar');

    fill('#name', 'Ana S. Souza');
    fill('#address', 'Rua das Flores, 10');
    fill('#discountPercentage', '15');
    fill('#planId', 'plano-vila-prata');
    fill('#guardianName', 'Marta S. Souza');
    submit();

    const request = http.expectOne(`${API_BASE_URL}/students/s1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      name: 'Ana S. Souza',
      email: 'ana@teste.com',
      phone: '(31) 90000-0000',
      address: 'Rua das Flores, 10',
      regionId: 'r-vila',
      planId: 'plano-vila-prata',
      discountPercentage: '15',
      contractStatus: 'active',
      guardian: {
        name: 'Marta S. Souza',
        phone: '(31) 98888-7777',
        cpf: '111.222.333-44',
        isFinancialResponsible: true,
      },
    });

    request.flush(student);
    await settleReload(student);
  });

  it('endereço vazio vira null, não string vazia', async () => {
    await open();
    click('Editar');

    fill('#address', '   ');
    submit();

    const request = http.expectOne(`${API_BASE_URL}/students/s1`);
    expect((request.request.body as { address: string | null }).address).toBeNull();
    request.flush(student);
    await settleReload(student);
  });

  it('não manda plano vazio quando a região muda e nenhum plano é escolhido', async () => {
    await open();
    click('Editar');

    /* Trocar de região limpa o select de plano de propósito (os planos são
     * por região). Salvar assim não pode virar 400 no backend. */
    fill('#regionId', 'r-cantinho');
    submit();

    const request = http.expectOne(`${API_BASE_URL}/students/s1`);
    const body = request.request.body as Record<string, unknown>;
    expect(body['regionId']).toBe('r-cantinho');
    expect(body['planId']).not.toBe('');

    request.flush(student);
    await settleReload(student);
  });

  it('aluno sem contrato não manda campos de contrato', async () => {
    await open({ ...student, contracts: [] });
    click('Editar');

    submit();

    const request = http.expectOne(`${API_BASE_URL}/students/s1`);
    const body = request.request.body as Record<string, unknown>;
    expect(body).not.toHaveProperty('planId');
    expect(body).not.toHaveProperty('contractStatus');
    expect(body).not.toHaveProperty('discountPercentage');

    request.flush({ ...student, contracts: [] });
    await settleReload({ ...student, contracts: [] });
  });

  it('aluno sem responsável não manda o bloco de responsável', async () => {
    await open({ ...student, guardians: [] });
    click('Editar');

    submit();

    const request = http.expectOne(`${API_BASE_URL}/students/s1`);
    expect(request.request.body).not.toHaveProperty('guardian');

    request.flush({ ...student, guardians: [] });
    await settleReload({ ...student, guardians: [] });
  });

  it('não salva com e-mail inválido', async () => {
    await open();
    click('Editar');

    fill('#email', 'nao-e-email');
    submit();

    http.expectNone(`${API_BASE_URL}/students/s1`);
  });

  it('inativar pede confirmação e manda active: false', async () => {
    await open();
    click('Inativar aluno');

    expect(text()).toContain('Inativar este aluno?');

    click('Inativar aluno');

    const request = http.expectOne(`${API_BASE_URL}/students/s1`);
    expect(request.request.body).toEqual({ active: false });

    request.flush({ ...student, active: false });
    await settleReload({ ...student, active: false });
  });

  it('aluno inativo não oferece o botão de inativar, e sim o de reativar', async () => {
    await open({ ...student, active: false });

    expect(text()).toContain('Inativo');
    expect(
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].some(
        (button) => button.textContent?.trim() === 'Inativar aluno',
      ),
    ).toBe(false);

    click('Reativar aluno');

    const request = http.expectOne(`${API_BASE_URL}/students/s1`);
    expect(request.request.body).toEqual({ active: true });

    request.flush({ ...student, active: true });
    await settleReload({ ...student, active: true });
  });

  it('mostra a mensagem de erro que o backend devolveu', async () => {
    await open();
    click('Editar');
    submit();

    http
      .expectOne(`${API_BASE_URL}/students/s1`)
      .flush(
        { message: ['Aluno não possui um contrato para editar'] },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();

    expect(text()).toContain('Aluno não possui um contrato para editar');
  });
});
