import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../service/api.config';
import { Senhas } from './senhas';

const USUARIOS = [
  { id: 'u1', name: 'Ana Souza', email: 'ana@exemplo.com', role: 'admin' },
  { id: 'u2', name: 'Bruno Lima', email: 'bruno@exemplo.com', role: 'professor' },
];

describe('Senhas do admin', () => {
  let fixture: ComponentFixture<Senhas>;
  let http: HttpTestingController;

  /* Sinais de rxResource chegam num microtask; roda a fila e re-renderiza. */
  async function tick(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Senhas);
    fixture.detectChanges();
    http.expectOne(`${API_BASE_URL}/users`).flush(USUARIOS);
    await tick();
  });

  afterEach(() => http.verify());

  it('lista os usuários carregados', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Ana Souza');
    expect(texto).toContain('bruno@exemplo.com');
  });

  it('filtra por nome ou e-mail', () => {
    const instance = fixture.componentInstance as unknown as {
      search: { set: (value: string) => void };
      filtered: () => unknown[];
    };

    instance.search.set('bruno');
    fixture.detectChanges();

    expect(instance.filtered()).toHaveLength(1);
  });

  it('define a senha nova e a mostra para o admin repassar', () => {
    const instance = fixture.componentInstance as unknown as {
      startEditing: (user: { id: string }) => void;
      newPassword: { set: (value: string) => void };
      confirm: () => void;
      lastDefined: () => { userId: string; password: string } | null;
    };

    instance.startEditing({ id: 'u2' });
    instance.newPassword.set('senha123');
    fixture.detectChanges();
    instance.confirm();

    const request = http.expectOne(`${API_BASE_URL}/users/u2/password`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ newPassword: 'senha123' });
    request.flush({ id: 'u2' });
    fixture.detectChanges();

    expect(instance.lastDefined()).toEqual({ userId: 'u2', password: 'senha123' });
  });

  it('recusa senha com menos de 6 caracteres sem chamar a API', () => {
    const instance = fixture.componentInstance as unknown as {
      startEditing: (user: { id: string }) => void;
      newPassword: { set: (value: string) => void };
      confirm: () => void;
      errorMessage: () => string | null;
    };

    instance.startEditing({ id: 'u2' });
    instance.newPassword.set('123');
    fixture.detectChanges();
    instance.confirm();

    http.expectNone(`${API_BASE_URL}/users/u2/password`);
    expect(instance.errorMessage()).toContain('6');
  });
});
