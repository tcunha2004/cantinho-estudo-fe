import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../service/api.config';
import { WhatsappService } from '../../service/whatsapp.service';
import { WhatsappBanner } from './whatsapp-banner';

/*
 * A faixa que avisa o admin, em qualquer página do painel, quando o WhatsApp
 * não está conectado: sem ela os alunos ficariam sem mensagem sem ninguém
 * saber. Também é ela quem alimenta o status que o modal de aprovação lê.
 */

const STATUS_URL = `${API_BASE_URL}/whatsapp/status`;

describe('WhatsappBanner', () => {
  let fixture: ComponentFixture<WhatsappBanner>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'whatsapp', children: [] },
          { path: '', children: [] },
        ]),
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

  async function open(state: string): Promise<void> {
    fixture = TestBed.createComponent(WhatsappBanner);
    fixture.detectChanges();
    http.expectOne(STATUS_URL).flush({ state, qrcode: null, phone: null, profileName: null });
    await tick();
  }

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it.each([
    ['disconnected', 'WhatsApp desconectado'],
    ['connecting', 'WhatsApp desconectado'],
    ['not_configured', 'WhatsApp não configurado no servidor.'],
    ['unreachable', 'Não foi possível verificar o WhatsApp.'],
  ])('mostra a faixa em %s', async (state, text) => {
    await open(state);

    expect(host().textContent).toContain(text);
    expect(host().querySelector('a[href="/whatsapp"]')?.textContent).toContain('Reconectar');
  });

  it('some quando conectado', async () => {
    await open('connected');

    expect(host().querySelector('[role="alert"]')).toBeNull();
  });

  it('guarda o status no serviço para quem só lê', async () => {
    await open('disconnected');

    expect(TestBed.inject(WhatsappService).status()?.state).toBe('disconnected');
  });

  it('erro na consulta não mostra faixa', async () => {
    fixture = TestBed.createComponent(WhatsappBanner);
    fixture.detectChanges();
    http.expectOne(STATUS_URL).flush(null, { status: 500, statusText: 'Erro' });
    await tick();

    expect(host().querySelector('[role="alert"]')).toBeNull();
  });

  /* A página consulta com `fresh`; uma resposta com cache da faixa chegando por
   * último poderia sobrescrever o status real. */
  it('some na própria página do WhatsApp e não consulta lá', async () => {
    await open('disconnected');
    expect(host().querySelector('[role="alert"]')).toBeTruthy();

    await TestBed.inject(Router).navigateByUrl('/whatsapp');
    fixture.detectChanges();
    await tick();

    http.expectNone(STATUS_URL);
    expect(host().querySelector('[role="alert"]')).toBeNull();
  });

  it('volta a consultar ao sair da página do WhatsApp', async () => {
    await open('connected');
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/whatsapp');
    fixture.detectChanges();
    await tick();
    http.expectNone(STATUS_URL);

    await router.navigateByUrl('/');
    fixture.detectChanges();
    http
      .expectOne(STATUS_URL)
      .flush({ state: 'disconnected', qrcode: null, phone: null, profileName: null });
    await tick();

    expect(host().querySelector('[role="alert"]')).toBeTruthy();
  });
});
