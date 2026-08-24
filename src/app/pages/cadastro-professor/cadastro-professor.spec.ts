import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { API_BASE_URL } from '../../service/api.config';
import { CadastroProfessor } from './cadastro-professor';

/*
 * A tela pública do cadastro do professor. O que importa aqui é o contrato com
 * o backend: só envia quando está tudo preenchido — matéria inclusive — e o
 * rascunho gravado é exatamente o que o professor digitou.
 */

const emptyForm = {
  id: 'link-1',
  role: 'professor',
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
  regions: [],
  subjects: [
    { id: 'sub-1', name: 'Matemática' },
    { id: 'sub-2', name: 'Português' },
  ],
};

describe('CadastroProfessor', () => {
  let fixture: ComponentFixture<CadastroProfessor>;
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
    fixture = TestBed.createComponent(CadastroProfessor);
    fixture.detectChanges();
    http.expectOne(`${API_BASE_URL}/signup-links/link-1/form`).flush(draft);
    await tick();
  }

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function text(): string {
    return host().textContent ?? '';
  }

  function send(): HTMLButtonElement {
    const found = [...host().querySelectorAll('button')].find((item) =>
      item.textContent?.trim().startsWith('Enviar'),
    );
    expect(found, 'botão "Enviar" não encontrado').toBeTruthy();
    return found!;
  }

  function fill(name: string, value: string): void {
    const input = host().querySelector(`[formcontrolname="${name}"]`) as
      HTMLInputElement | HTMLTextAreaElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function pick(subject: string): void {
    const label = [...host().querySelectorAll('label')].find((item) =>
      item.textContent?.trim().startsWith(subject),
    );
    expect(label, `matéria "${subject}" não encontrada`).toBeTruthy();
    (label!.querySelector('input') as HTMLInputElement).click();
    fixture.detectChanges();
  }

  function fillEverything(): void {
    fill('name', 'Carlos Lima');
    fill('email', 'carlos@teste.com');
    fill('password', 'senha123');
    fill('passwordConfirm', 'senha123');
    fill('bio', 'Licenciado em Matemática, 10 anos de sala de aula.');
    pick('Matemática');
  }

  it('mostra as matérias que a escola cadastrou', async () => {
    await open();

    expect(text()).toContain('Matemática');
    expect(text()).toContain('Português');
  });

  it('não envia com o formulário incompleto', async () => {
    await open();

    expect(send().disabled).toBe(true);
  });

  /* Sem matéria o professor não leciona nada — o backend recusa o envio. */
  it('não envia sem escolher matéria', async () => {
    await open();
    fill('name', 'Carlos Lima');
    fill('email', 'carlos@teste.com');
    fill('password', 'senha123');
    fill('passwordConfirm', 'senha123');
    fill('bio', 'Licenciado em Matemática, 10 anos de sala de aula.');

    expect(send().disabled).toBe(true);
  });

  it('senhas diferentes bloqueiam o envio', async () => {
    await open();
    fillEverything();
    fill('passwordConfirm', 'outra-senha');

    expect(send().disabled).toBe(true);
  });

  it('envia o rascunho e depois o formulário', async () => {
    await open();
    fillEverything();
    send().click();
    fixture.detectChanges();

    const draft = http.expectOne(`${API_BASE_URL}/signup-links/link-1`);
    expect(draft.request.method).toBe('PATCH');
    expect(draft.request.body).toEqual({
      studentName: 'Carlos Lima',
      studentEmail: 'carlos@teste.com',
      password: 'senha123',
      bio: 'Licenciado em Matemática, 10 anos de sala de aula.',
      subjectIds: ['sub-1'],
    });
    draft.flush(null);
    await tick();

    http.expectOne(`${API_BASE_URL}/signup-links/link-1/submit`).flush(null);
    await tick();

    expect(text()).toContain('Seus dados foram enviados');
  });

  it('repõe o rascunho já preenchido, menos a senha', async () => {
    await open({
      ...emptyForm,
      studentName: 'Carlos Lima',
      studentEmail: 'carlos@teste.com',
      bio: 'Licenciado em Matemática, 10 anos de sala de aula.',
      subjectIds: ['sub-2'],
      hasPassword: true,
    });

    const name = host().querySelector('[formcontrolname="name"]') as HTMLInputElement;
    const password = host().querySelector('[formcontrolname="password"]') as HTMLInputElement;
    expect(name.value).toBe('Carlos Lima');
    expect(password.value).toBe('');
    /* A senha não volta do backend: sem digitar de novo, não envia. */
    expect(send().disabled).toBe(true);
  });

  it('link expirado é tela, não erro', async () => {
    fixture = TestBed.createComponent(CadastroProfessor);
    fixture.detectChanges();
    http
      .expectOne(`${API_BASE_URL}/signup-links/link-1/form`)
      .flush({ message: 'expirou' }, { status: 410, statusText: 'expirou' });
    await tick();

    expect(text()).toContain('Este cadastro já foi enviado');
  });

  it('falha no envio fica na tela do formulário', async () => {
    await open();
    fillEverything();
    send().click();
    fixture.detectChanges();

    http
      .expectOne(`${API_BASE_URL}/signup-links/link-1`)
      .flush(
        { message: 'Cadastro incompleto: falta apresentação' },
        { status: 400, statusText: 'ruim' },
      );
    await tick();

    expect(text()).toContain('Cadastro incompleto: falta apresentação');
    expect(text()).toContain('Dados do professor');
  });
});
