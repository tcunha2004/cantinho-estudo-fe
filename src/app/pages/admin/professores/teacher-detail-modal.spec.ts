import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../service/api.config';
import { TeacherDetailModal } from './teacher-detail-modal';

/* Edição do professor pelo admin: dados cadastrais, matérias e inativação. */

const teacher = {
  id: 't1',
  name: 'Renata Lima',
  email: 'renata@teste.com',
  bio: 'Licenciada em Matemática',
  active: true,
  subjects: [{ id: 'sub-mat', name: 'Matemática' }],
};

const allSubjects = [
  { id: 'sub-mat', name: 'Matemática' },
  { id: 'sub-fis', name: 'Física' },
  { id: 'sub-qui', name: 'Química' },
];

describe('TeacherDetailModal', () => {
  let fixture: ComponentFixture<TeacherDetailModal>;
  let http: HttpTestingController;

  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function tick(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  }

  async function open(detail: object = teacher): Promise<void> {
    fixture = TestBed.createComponent(TeacherDetailModal);
    fixture.componentRef.setInput('teacherId', 't1');
    fixture.detectChanges();

    http.expectOne(`${API_BASE_URL}/subjects`).flush(allSubjects);
    http.expectOne(`${API_BASE_URL}/teachers/t1`).flush(detail);
    await tick();
  }

  async function settleReload(detail: object = teacher): Promise<void> {
    await tick();
    for (const request of http.match(`${API_BASE_URL}/teachers/t1`)) {
      request.flush(detail);
    }
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

  function fill(selector: string, value: string): void {
    const element = (fixture.nativeElement as HTMLElement).querySelector(
      selector,
    ) as HTMLInputElement;
    element.value = value;
    element.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  /* Checkbox de matéria, na ordem em que aparece na lista mestra. */
  function checkbox(index: number): HTMLInputElement {
    return [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"]',
      ),
    ][index];
  }

  function toggle(index: number): void {
    const input = checkbox(index);
    input.checked = !input.checked;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function submit(): void {
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('mostra dados e matérias em modo leitura', async () => {
    await open();

    expect(text()).toContain('Renata Lima');
    expect(text()).toContain('renata@teste.com');
    expect(text()).toContain('Matemática');
    expect(text()).toContain('Ativo');
  });

  it('marca no checklist apenas as matérias que o professor leciona', async () => {
    await open();
    click('Editar');

    expect(checkbox(0).checked).toBe(true);
    expect(checkbox(1).checked).toBe(false);
    expect(checkbox(2).checked).toBe(false);
  });

  it('salva dados cadastrais e a nova lista de matérias', async () => {
    await open();
    click('Editar');

    fill('#name', 'Renata L. Lima');
    fill('#bio', 'Mestre em Educação');
    toggle(1);
    submit();

    const request = http.expectOne(`${API_BASE_URL}/teachers/t1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      name: 'Renata L. Lima',
      email: 'renata@teste.com',
      bio: 'Mestre em Educação',
      subjectIds: ['sub-mat', 'sub-fis'],
    });

    request.flush(teacher);
    await settleReload();
  });

  it('desmarcar todas as matérias manda lista vazia, não campo ausente', async () => {
    await open();
    click('Editar');

    toggle(0);
    submit();

    const request = http.expectOne(`${API_BASE_URL}/teachers/t1`);
    expect((request.request.body as { subjectIds: string[] }).subjectIds).toEqual([]);

    request.flush({ ...teacher, subjects: [] });
    await settleReload({ ...teacher, subjects: [] });
  });

  it('bio vazia vira null', async () => {
    await open();
    click('Editar');

    fill('#bio', '   ');
    submit();

    const request = http.expectOne(`${API_BASE_URL}/teachers/t1`);
    expect((request.request.body as { bio: string | null }).bio).toBeNull();

    request.flush({ ...teacher, bio: null });
    await settleReload({ ...teacher, bio: null });
  });

  it('não salva com e-mail inválido', async () => {
    await open();
    click('Editar');

    fill('#email', 'sem-arroba');
    submit();

    http.expectNone(`${API_BASE_URL}/teachers/t1`);
  });

  it('inativar pede confirmação e manda active: false', async () => {
    await open();
    click('Inativar professor');

    expect(text()).toContain('Inativar este professor?');

    click('Inativar professor');

    const request = http.expectOne(`${API_BASE_URL}/teachers/t1`);
    expect(request.request.body).toEqual({ active: false });

    request.flush({ ...teacher, active: false });
    await settleReload({ ...teacher, active: false });
  });

  it('professor inativo não oferece o botão de inativar', async () => {
    await open({ ...teacher, active: false });

    expect(text()).toContain('Inativo');
    expect(
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].some(
        (button) => button.textContent?.trim() === 'Inativar professor',
      ),
    ).toBe(false);
  });

  it('professor inativo mostra o botão de reativar, que manda active: true', async () => {
    await open({ ...teacher, active: false });

    click('Reativar professor');

    const request = http.expectOne(`${API_BASE_URL}/teachers/t1`);
    expect(request.request.body).toEqual({ active: true });

    request.flush({ ...teacher, active: true });
    await settleReload({ ...teacher, active: true });
  });

  it('mostra a mensagem de erro que o backend devolveu', async () => {
    await open();
    click('Editar');
    submit();

    http
      .expectOne(`${API_BASE_URL}/teachers/t1`)
      .flush({ message: 'Professor não encontrado' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(text()).toContain('Professor não encontrado');
  });
});
