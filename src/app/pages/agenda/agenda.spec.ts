import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { appConfig } from '../../app.config';
import { API_BASE_URL } from '../../service/api.config';
import { Agenda } from './agenda';

/*
 * Professor inativado pelo admin continua conseguindo logar, então a agenda é
 * onde ele descobre que não pode mais agendar. Se este bloqueio cair, o
 * backend ainda barra o POST — mas o professor só vê o erro depois de
 * preencher o formulário todo.
 */

const TOKEN_KEY = 'access_token';

function professorToken(): string {
  const payload = {
    sub: 'u1',
    name: 'Renata Lima',
    email: 'renata@teste.com',
    role: 'professor',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
  return `cabecalho.${encoded}.assinatura`;
}

describe('Agenda do professor inativo', () => {
  let fixture: ComponentFixture<Agenda>;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, professorToken());
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear();
    http.verify();
  });

  /* `active` decide o bloqueio; o resto da tela é ruído para este teste. */
  async function render(active: boolean): Promise<void> {
    fixture = TestBed.createComponent(Agenda);
    fixture.detectChanges();

    http.expectOne(`${API_BASE_URL}/teachers/me/active`).flush({ active });
    http.expectOne((request) => request.url === `${API_BASE_URL}/classes/agenda`).flush([]);
    await Promise.resolve();
    fixture.detectChanges();

    /* Ativo pede as opções do formulário; inativo não chega a agendar nada. */
    for (const pending of http.match(`${API_BASE_URL}/classes/form-options`)) {
      pending.flush({ teachers: [], subjects: [], students: [] });
    }
    await Promise.resolve();
    fixture.detectChanges();
  }

  function aviso(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]');
  }

  function agenda(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('[inert]');
  }

  it('mostra o aviso e deixa a agenda inerte', async () => {
    await render(false);

    expect(aviso()?.textContent).toContain('inativo');
    /* O `inert` é o que corta clique, foco e teclado do conteúdo atrás — e
     * precisa estar no invólucro que contém a agenda, não em outro nó. */
    expect(agenda()).not.toBeNull();
    expect(agenda()!.querySelector('app-calendar-grid')).not.toBeNull();
  });

  it('professor ativo entra na agenda sem aviso e sem bloqueio', async () => {
    await render(true);

    expect(aviso()).toBeNull();
    expect(agenda()).toBeNull();
  });
});
