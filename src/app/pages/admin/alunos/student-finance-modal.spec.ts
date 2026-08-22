import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../service/api.config';
import { StudentFinanceModal } from './student-finance-modal';

/*
 * O que importa aqui: cada parcela cai no contrato certo (o admin lê o
 * histórico contrato a contrato), os totais do topo somam por status, e mudar
 * o status de uma parcela só manda o PATCH depois de confirmado — escolher no
 * select por si só não toca em nada.
 */

const student = {
  id: 's1',
  name: 'Ana Souza',
  email: 'ana@teste.com',
  phone: '(31) 90000-0000',
  address: null,
  active: true,
  region: { id: 'r-vila', name: 'Vila da Serra' },
  guardians: [],
  contracts: [
    {
      id: 'c2',
      planId: 'p-ouro',
      planType: 'ouro',
      frequency: 3,
      status: 'active',
      startDate: '2026-07-01',
      endDate: null,
      discountPercentage: '10.00',
    },
    {
      id: 'c1',
      planId: 'p-prata',
      planType: 'prata',
      frequency: null,
      status: 'cancelled',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      discountPercentage: null,
    },
  ],
};

const payments = [
  {
    id: 'pg3',
    contractId: 'c2',
    amount: '900.00',
    dueDate: '2026-08-05',
    paidAt: null,
    status: 'pending',
    planType: 'ouro',
    classesCount: 12,
  },
  {
    id: 'pg2',
    contractId: 'c2',
    amount: '450.00',
    dueDate: '2026-07-05',
    paidAt: '2026-07-04 10:00:00',
    status: 'paid',
    planType: 'ouro',
    classesCount: 6,
  },
  {
    id: 'pg1',
    contractId: 'c1',
    amount: '600.00',
    dueDate: '2026-06-05',
    paidAt: null,
    status: 'pending',
    planType: 'prata',
    classesCount: 8,
  },
];

describe('StudentFinanceModal', () => {
  let fixture: ComponentFixture<StudentFinanceModal>;
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

  async function tick(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  }

  async function open(): Promise<void> {
    fixture = TestBed.createComponent(StudentFinanceModal);
    fixture.componentRef.setInput('studentId', 's1');
    fixture.detectChanges();

    http.expectOne(`${API_BASE_URL}/students/s1`).flush(student);
    http.expectOne(`${API_BASE_URL}/students/s1/payments`).flush(payments);
    await tick();
  }

  function section(index: number): HTMLElement {
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('section.rounded-3xl')][
      index
    ] as HTMLElement;
  }

  /* Primeira linha da tabela do bloco. */
  function statusSelect(scope: Element): HTMLSelectElement {
    return scope.querySelector('tbody tr select') as HTMLSelectElement;
  }

  function button(scope: Element, text: string): HTMLButtonElement {
    const match = [...scope.querySelectorAll('tbody tr button')].find((el) =>
      el.textContent?.trim().startsWith(text),
    );

    if (!match) {
      throw new Error(`Botão "${text}" não encontrado`);
    }

    return match as HTMLButtonElement;
  }

  function selectStatus(select: HTMLSelectElement, status: string): void {
    select.value = status;
    select.dispatchEvent(new Event('change'));
  }

  afterEach(() => http.verify());

  it('agrupa as parcelas por contrato, na ordem dos contratos', async () => {
    await open();

    const sections = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('section.rounded-3xl'),
    ];
    expect(sections.length).toBe(2);

    /* Contrato vigente primeiro, com as duas parcelas dele e o total do bloco. */
    expect(sections[0].textContent).toContain('Ouro');
    expect(sections[0].querySelectorAll('tbody tr').length).toBe(2);

    /* Contrato cancelado depois, com a parcela em aberto. */
    expect(sections[1].textContent).toContain('Prata');
    expect(sections[1].textContent).toContain('Cancelado');
    expect(sections[1].querySelectorAll('tbody tr').length).toBe(1);
    expect(statusSelect(sections[1]).value).toBe('pending');
  });

  it('soma os totais por status', async () => {
    await open();

    const totals = fixture.componentInstance['totals']();
    expect(totals).toEqual({ paid: 450, pending: 1500, count: 3 });
  });

  it('só mudar o select não manda nada — precisa confirmar', async () => {
    await open();

    selectStatus(statusSelect(section(0)), 'paid');
    await tick();

    http.expectNone(`${API_BASE_URL}/students/s1/payments/pg3`);
    expect(button(section(0), 'Confirmar')).toBeTruthy();
  });

  it('cancelar desiste da troca sem tocar no backend', async () => {
    await open();

    const select = statusSelect(section(0));
    selectStatus(select, 'paid');
    await tick();

    button(section(0), 'Cancelar').click();
    await tick();

    http.expectNone(`${API_BASE_URL}/students/s1/payments/pg3`);
    expect(select.value).toBe('pending');
  });

  it('escolher outra parcela desfaz a troca preparada anterior', async () => {
    await open();

    const first = statusSelect(section(0));
    selectStatus(first, 'paid');
    await tick();

    const second = statusSelect(section(1));
    selectStatus(second, 'paid');
    await tick();

    /* A primeira volta ao valor real; só a segunda continua preparada. */
    expect(first.value).toBe('pending');
    expect(() => button(section(0), 'Confirmar')).toThrow();
    expect(button(section(1), 'Confirmar')).toBeTruthy();
  });

  it('confirmar fecha uma parcela: manda o PATCH e recarrega a lista', async () => {
    await open();

    selectStatus(statusSelect(section(0)), 'paid');
    await tick();
    button(section(0), 'Confirmar').click();
    await tick();

    const request = http.expectOne(`${API_BASE_URL}/students/s1/payments/pg3`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'paid' });
    request.flush({ ...payments[0], status: 'paid', paidAt: '2026-08-18 09:00:00' });
    await tick();

    /* Reload: os totais, a data de pagamento e o contrato (uma troca de plano
     * pode ter sido efetivada) vêm do backend, não do otimismo. */
    http.expectOne(`${API_BASE_URL}/students/s1`).flush(student);
    http
      .expectOne(`${API_BASE_URL}/students/s1/payments`)
      .flush([
        { ...payments[0], status: 'paid', paidAt: '2026-08-18 09:00:00' },
        ...payments.slice(1),
      ]);
    await tick();

    expect(statusSelect(section(0)).value).toBe('paid');
    expect(fixture.componentInstance['totals']().paid).toBe(1350);
    /* Confirmada, a troca não fica mais preparada — some Confirmar/Cancelar. */
    expect(() => button(section(0), 'Confirmar')).toThrow();
  });

  it('erro no PATCH mostra a mensagem do backend e desfaz o select', async () => {
    await open();

    selectStatus(statusSelect(section(0)), 'paid');
    await tick();
    button(section(0), 'Confirmar').click();
    await tick();

    http
      .expectOne(`${API_BASE_URL}/students/s1/payments/pg3`)
      .flush(
        { message: 'Parcela não encontrada para este aluno' },
        { status: 404, statusText: 'Not Found' },
      );
    await tick();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Parcela não encontrada para este aluno',
    );
    expect(statusSelect(section(0)).value).toBe('pending');
  });
});
