import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { API_BASE_URL } from '../../service/api.config';
import { Cadastro } from './cadastro';

/*
 * A tela pública do cadastro. O que importa aqui é o contrato com o backend:
 * a fase só avança quando está válida, e cada avanço grava exatamente o que
 * aquela fase preencheu — é isso que faz fechar a aba não custar o formulário.
 */

/* Como o endpoint público entrega: sem `classCommission`. */
const regions = [
  {
    id: 'r-vila',
    name: 'Vila da Serra',
    slug: 'vila-da-serra',
    enrollmentFee: '200.00',
    plans: [
      {
        id: 'plano-ouro',
        planType: 'ouro',
        frequency: 3,
        monthlyPrice: '1860.00',
        hourPrice: '155.00',
        classesCount: 12,
        validityMonths: null,
      },
      {
        id: 'plano-prata',
        planType: 'prata',
        frequency: null,
        monthlyPrice: '900.00',
        hourPrice: '112.00',
        classesCount: 8,
        validityMonths: null,
      },
    ],
  },
  {
    id: 'r-cantinho',
    name: 'Cantinho',
    slug: 'cantinho',
    enrollmentFee: '165.00',
    plans: [
      {
        id: 'plano-cantinho',
        planType: 'prata',
        frequency: null,
        monthlyPrice: '600.00',
        hourPrice: '75.00',
        classesCount: 8,
        validityMonths: null,
      },
    ],
  },
];

const emptyForm = {
  id: 'link-1',
  role: 'student',
  studentName: null,
  studentEmail: null,
  studentPhone: null,
  studentAddress: null,
  regionId: null,
  planId: null,
  guardians: null,
  bio: null,
  subjectIds: null,
  hasPassword: false,
  regions,
  subjects: [],
};

describe('Cadastro', () => {
  let fixture: ComponentFixture<Cadastro>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'link-1' }) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function tick(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  }

  async function open(draft: object = emptyForm): Promise<void> {
    fixture = TestBed.createComponent(Cadastro);
    fixture.detectChanges();
    http.expectOne(`${API_BASE_URL}/signup-links/link-1/form`).flush(draft);
    await tick();
  }

  async function openWithError(status: number): Promise<void> {
    fixture = TestBed.createComponent(Cadastro);
    fixture.detectChanges();
    http
      .expectOne(`${API_BASE_URL}/signup-links/link-1/form`)
      .flush({ message: 'erro' }, { status, statusText: 'erro' });
    await tick();
  }

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function text(): string {
    return host().textContent ?? '';
  }

  function button(label: string): HTMLButtonElement {
    const found = [...host().querySelectorAll('button')].find((item) =>
      item.textContent?.trim().startsWith(label),
    );
    expect(found, `botão "${label}" não encontrado`).toBeTruthy();
    return found!;
  }

  function fill(selector: string, value: string): void {
    const element = host().querySelector(selector) as HTMLInputElement | HTMLSelectElement | null;
    expect(element, `campo ${selector} não encontrado`).toBeTruthy();
    element!.value = value;
    element!.dispatchEvent(new Event(element!.tagName === 'SELECT' ? 'change' : 'input'));
    fixture.detectChanges();
  }

  /*
   * Select com `[value]` recebe um id sintético do Angular ("0: 'r-vila'"),
   * não o id da região — por isso a escolha é pelo texto da opção.
   */
  function choose(selector: string, label: string): void {
    const element = host().querySelector(selector) as HTMLSelectElement;
    const option = [...element.options].find((item) => item.textContent?.trim() === label);
    expect(option, `opção "${label}" não encontrada`).toBeTruthy();
    element.value = option!.value;
    element.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  /* Preenche a fase 1 inteira com dados válidos. */
  function fillStudent(): void {
    fill('#studentName', 'Ana Souza');
    fill('#studentEmail', 'ana@teste.com');
    fill('#studentPhone', '31900001111');
    fill('#password', 'senha123');
    fill('#passwordConfirm', 'senha123');
    choose('#regionId', 'Vila da Serra');
  }

  function fillGuardian(): void {
    fill('#guardianName0', 'Marta Souza');
    fill('#guardianPhone0', '31988887777');
    fill('#guardianCpf0', '11122233344');
  }

  /* jsdom não submete o form ao clicar no botão — dispara o evento direto. */
  function submitForm(): void {
    host().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  /* Avança uma fase consumindo o PATCH e devolve o corpo enviado. */
  async function advance(): Promise<unknown> {
    submitForm();
    const request = http.expectOne(`${API_BASE_URL}/signup-links/link-1`);
    expect(request.request.method).toBe('PATCH');
    const { body } = request.request;
    request.flush(null);
    await tick();
    return body;
  }

  it('mostra as quatro fases e começa na primeira', async () => {
    await open();

    expect(text()).toContain('Dados do aluno');
    expect(text()).toContain('Responsáveis');
    expect(text()).toContain('Plano');
    expect(text()).toContain('Revisão');
    expect(host().querySelector('#studentName')).toBeTruthy();
  });

  it('bloqueia o avanço enquanto a fase não está preenchida', async () => {
    await open();

    expect(button('Próximo').disabled).toBe(true);

    fillStudent();

    expect(button('Próximo').disabled).toBe(false);
  });

  it('não avança com senhas diferentes', async () => {
    await open();
    fillStudent();
    fill('#passwordConfirm', 'outra-senha');

    expect(button('Próximo').disabled).toBe(true);
  });

  it('salva os dados do aluno ao avançar', async () => {
    await open();
    fillStudent();
    fill('#studentAddress', '  ');

    await expect(advance()).resolves.toEqual({
      studentName: 'Ana Souza',
      studentEmail: 'ana@teste.com',
      studentPhone: '31900001111',
      /* Endereço em branco vira nulo, não string vazia. */
      studentAddress: null,
      regionId: 'r-vila',
      password: 'senha123',
    });
    expect(host().querySelector('#guardianName0')).toBeTruthy();
  });

  it('salva os responsáveis com o financeiro marcado', async () => {
    await open();
    fillStudent();
    await advance();

    fillGuardian();
    button('Adicionar responsável').click();
    fixture.detectChanges();
    fill('#guardianName1', 'João Souza');
    fill('#guardianPhone1', '31977776666');
    fill('#guardianCpf1', '55566677788');

    await expect(advance()).resolves.toEqual({
      guardians: [
        {
          name: 'Marta Souza',
          phone: '31988887777',
          cpf: '11122233344',
          rg: null,
          /* O primeiro é o financeiro por padrão — é um rádio, nunca dois. */
          isFinancialResponsible: true,
        },
        {
          name: 'João Souza',
          phone: '31977776666',
          cpf: '55566677788',
          rg: null,
          isFinancialResponsible: false,
        },
      ],
    });
  });

  it('mostra só os planos da região escolhida, com a taxa de matrícula', async () => {
    await open();
    fillStudent();
    await advance();
    fillGuardian();
    await advance();

    expect(text()).toContain('Vila da Serra');
    expect(text()).toContain('Ouro · 3x por semana');
    expect(text()).toContain('Prata');
    /* Taxa de matrícula é informativa: cobrada fora do sistema. */
    expect(text()).toContain('Taxa de matrícula');
    /* O TestBed não registra o locale pt-BR do app.config. */
    expect(text()).toMatch(/200[.,]00/);
    expect(button('Próximo').disabled).toBe(true);
  });

  it('salva o plano escolhido e revisa antes de enviar', async () => {
    await open();
    fillStudent();
    await advance();
    fillGuardian();
    await advance();

    button('Ouro').click();
    fixture.detectChanges();

    await expect(advance()).resolves.toEqual({ planId: 'plano-ouro' });

    expect(text()).toContain('Revisão');
    expect(text()).toContain('Ana Souza');
    expect(text()).toContain('Marta Souza');
    expect(text()).toContain('Financeiro');
    expect(text()).toContain('Ouro · 3x por semana');
  });

  it('envia o cadastro e confirma para o aluno', async () => {
    await open();
    fillStudent();
    await advance();
    fillGuardian();
    await advance();
    button('Ouro').click();
    fixture.detectChanges();
    await advance();

    submitForm();

    const request = http.expectOne(`${API_BASE_URL}/signup-links/link-1/submit`);
    expect(request.request.method).toBe('POST');
    request.flush(null);
    await tick();

    expect(text()).toContain('Seus dados foram enviados');
  });

  it('trocar de região limpa o plano já escolhido', async () => {
    await open();
    fillStudent();
    await advance();
    fillGuardian();
    await advance();
    button('Ouro').click();
    fixture.detectChanges();

    /* Volta para a fase 1 e troca a região. */
    button('Voltar').click();
    fixture.detectChanges();
    button('Voltar').click();
    fixture.detectChanges();
    choose('#regionId', 'Cantinho');

    await advance();
    await advance();

    expect(text()).toContain('Cantinho');
    /* Sem plano válido para a região nova, não dá para seguir. */
    expect(button('Próximo').disabled).toBe(true);
  });

  it('restaura o rascunho já salvo', async () => {
    await open({
      ...emptyForm,
      studentName: 'Ana Souza',
      studentEmail: 'ana@teste.com',
      studentPhone: '31900001111',
      regionId: 'r-vila',
      planId: 'plano-prata',
      guardians: [
        {
          name: 'Marta Souza',
          phone: '31988887777',
          cpf: '11122233344',
          rg: null,
          isFinancialResponsible: true,
        },
      ],
      hasPassword: true,
    });

    expect((host().querySelector('#studentName') as HTMLInputElement).value).toBe('Ana Souza');
    expect((host().querySelector('#regionId') as HTMLSelectElement).value).toBe('r-vila');
  });

  it('link inexistente vira tela de erro', async () => {
    await openWithError(404);

    expect(text()).toContain('Link indisponível');
    expect(text()).toContain('inválido ou não encontrado');
  });

  it('link já enviado avisa que o cadastro está em análise', async () => {
    await openWithError(410);

    expect(text()).toContain('Este cadastro já foi enviado');
  });
});
