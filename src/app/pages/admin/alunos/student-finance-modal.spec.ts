import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../service/api.config';
import { StudentFinanceModal } from './student-finance-modal';

/*
 * O que importa aqui: cada parcela cai no contrato certo (o admin lê o
 * histórico contrato a contrato) e os totais do topo somam por status.
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
    status: 'overdue',
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

    /* Contrato cancelado depois, com a parcela vencida. */
    expect(sections[1].textContent).toContain('Prata');
    expect(sections[1].textContent).toContain('Cancelado');
    expect(sections[1].querySelectorAll('tbody tr').length).toBe(1);
    expect(sections[1].textContent).toContain('Vencido');
  });

  it('soma os totais por status', async () => {
    await open();

    const totals = fixture.componentInstance['totals']();
    expect(totals).toEqual({ paid: 450, pending: 900, overdue: 600, count: 3 });
  });
});
