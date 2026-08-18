import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { API_BASE_URL } from '../service/api.config';
import { authGuard, guestGuard, roleGuard } from './auth.guard';
import { authInterceptor } from './auth.interceptor';
import { Session } from './session';

/*
 * Sessão, guardas e interceptor: quem entra, quem é barrado e o que vai no
 * header. Um erro aqui manda o usuário para a tela de outro papel — ou o
 * deixa preso no login.
 */

const TOKEN_KEY = 'access_token';

/* JWT de mentira: só o payload importa, ninguém verifica assinatura no front. */
function makeToken(role: string, secondsFromNow = 3600): string {
  const payload = {
    sub: 'u1',
    name: 'Fulano',
    email: 'fulano@teste.com',
    role,
    exp: Math.floor(Date.now() / 1000) + secondsFromNow,
  };
  const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
  return `cabecalho.${encoded}.assinatura`;
}

function route(roles?: string[]): ActivatedRouteSnapshot {
  return { data: roles ? { roles } : {} } as unknown as ActivatedRouteSnapshot;
}

const state = {} as RouterStateSnapshot;

describe('Session', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    return {
      session: TestBed.inject(Session),
      http: TestBed.inject(HttpTestingController),
    };
  }

  it('sem token, ninguém está logado', () => {
    const { session } = setup();

    expect(session.isLoggedIn()).toBe(false);
    expect(session.role()).toBeNull();
  });

  it('lê o papel do token guardado', () => {
    localStorage.setItem(TOKEN_KEY, makeToken('professor'));
    const { session } = setup();

    expect(session.isLoggedIn()).toBe(true);
    expect(session.role()).toBe('professor');
    expect(session.user()?.email).toBe('fulano@teste.com');
  });

  it('descarta token expirado do armazenamento', () => {
    localStorage.setItem(TOKEN_KEY, makeToken('admin', -60));
    const { session } = setup();

    expect(session.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('token malformado não derruba a aplicação', () => {
    localStorage.setItem(TOKEN_KEY, 'isso-nao-e-um-jwt');
    const { session } = setup();

    expect(session.isLoggedIn()).toBe(false);
  });

  it('login guarda o token e logout apaga', () => {
    const { session, http } = setup();
    const token = makeToken('admin');

    session.login('admin@teste.com', 'teste123', 'admin').subscribe();
    const request = http.expectOne(`${API_BASE_URL}/auth/login`);
    expect(request.request.body).toEqual({
      email: 'admin@teste.com',
      password: 'teste123',
      role: 'admin',
    });
    request.flush({ access_token: token });

    expect(session.role()).toBe('admin');
    expect(localStorage.getItem(TOKEN_KEY)).toBe(token);

    session.logout();

    expect(session.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    http.verify();
  });
});

describe('guardas de rota', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  function run<T>(guard: () => T): T {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    return TestBed.runInInjectionContext(guard);
  }

  function path(result: unknown): string {
    return TestBed.inject(Router).serializeUrl(result as UrlTree);
  }

  it('authGuard: sem sessão manda para o login', () => {
    const result = run(() => authGuard(route(), state));

    expect(result).not.toBe(true);
    expect(path(result)).toBe('/login');
  });

  it('authGuard: com sessão libera', () => {
    localStorage.setItem(TOKEN_KEY, makeToken('admin'));

    expect(run(() => authGuard(route(), state))).toBe(true);
  });

  it('roleGuard: papel permitido passa', () => {
    localStorage.setItem(TOKEN_KEY, makeToken('admin'));

    expect(run(() => roleGuard(route(['admin']), state))).toBe(true);
  });

  it('roleGuard: professor tentando tela de admin volta para a agenda', () => {
    localStorage.setItem(TOKEN_KEY, makeToken('professor'));
    const result = run(() => roleGuard(route(['admin']), state));

    expect(path(result)).toBe('/agenda');
  });

  it('roleGuard: aluno tentando tela de professor volta para a agenda', () => {
    localStorage.setItem(TOKEN_KEY, makeToken('student'));
    const result = run(() => roleGuard(route(['professor']), state));

    expect(path(result)).toBe('/agenda');
  });

  it('roleGuard: admin fora do painel de admin volta para o painel', () => {
    localStorage.setItem(TOKEN_KEY, makeToken('admin'));
    const result = run(() => roleGuard(route(['professor']), state));

    expect(path(result)).toBe('/painel');
  });

  it('roleGuard: sem sessão manda para o login', () => {
    const result = run(() => roleGuard(route(['admin']), state));

    expect(path(result)).toBe('/login');
  });

  it('guestGuard: quem já está logado não volta ao login', () => {
    localStorage.setItem(TOKEN_KEY, makeToken('admin'));
    const result = run(() => guestGuard(route(), state));

    expect(path(result)).toBe('/painel');
  });

  it('guestGuard: visitante entra no login', () => {
    expect(run(() => guestGuard(route(), state))).toBe(true);
  });
});

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(TOKEN_KEY, makeToken('admin'));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });

  afterEach(() => localStorage.clear());

  it('anexa o token nas chamadas da API', () => {
    client.get(`${API_BASE_URL}/students/active`).subscribe();

    const request = http.expectOne(`${API_BASE_URL}/students/active`);
    expect(request.request.headers.get('Authorization')).toBe(
      `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
    );
    request.flush([]);
  });

  it('não anexa o token em requisição para outro domínio', () => {
    client.get('https://exemplo.com/dados').subscribe();

    const request = http.expectOne('https://exemplo.com/dados');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('401 encerra a sessão e devolve ao login', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    client.get(`${API_BASE_URL}/students/active`).subscribe({ error: () => undefined });
    http
      .expectOne(`${API_BASE_URL}/students/active`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(TestBed.inject(Session).isLoggedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('erro que não é 401 mantém a sessão', () => {
    client.get(`${API_BASE_URL}/students/active`).subscribe({ error: () => undefined });
    http
      .expectOne(`${API_BASE_URL}/students/active`)
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(TestBed.inject(Session).isLoggedIn()).toBe(true);
  });
});
