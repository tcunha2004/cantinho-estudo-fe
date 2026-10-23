import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WhatsappFailureDto, WhatsappStatusDto } from '../../../model/dto/whatsapp.dto';
import { API_BASE_URL } from '../../../service/api.config';
import { formatPhone, POLL_MS, qrSrc, Whatsapp } from './whatsapp';

/*
 * Conexão do WhatsApp do admin. O que este teste protege: o fluxo de QR (a
 * página consulta sozinha e para quando o estado deixa de ser "aguardando
 * leitura" — inclusive quando o QR expira) e a lista de falhas, onde reenviar
 * e descartar não podem sumir com uma mensagem que ainda não foi entregue.
 */

const STATUS_URL = `${API_BASE_URL}/whatsapp/status?fresh=true`;

function status(state: WhatsappStatusDto['state'], extra: Partial<WhatsappStatusDto> = {}) {
  return { state, qrcode: null, phone: null, profileName: null, ...extra } as WhatsappStatusDto;
}

const failure = (overrides: Partial<WhatsappFailureDto> = {}): WhatsappFailureDto => ({
  id: 'm1',
  recipientName: 'Ana',
  phone: '31',
  text: 't',
  error: 'Telefone inválido',
  createdAt: '2026-10-22T10:00:00',
  ...overrides,
});

describe('Whatsapp (admin)', () => {
  let fixture: ComponentFixture<Whatsapp>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    http.verify();
  });

  /* Sinais de rxResource chegam num microtask; roda a fila e re-renderiza. */
  async function tick(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  }

  async function open(current: WhatsappStatusDto, failures: WhatsappFailureDto[] = []) {
    fixture = TestBed.createComponent(Whatsapp);
    fixture.detectChanges();
    http.expectOne(STATUS_URL).flush(current);
    http.expectOne(`${API_BASE_URL}/whatsapp/messages/failures`).flush(failures);
    await tick();
  }

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function text(): string {
    return host().textContent ?? '';
  }

  function buttons(label: string): HTMLButtonElement[] {
    return [...host().querySelectorAll('button')].filter((item) =>
      item.textContent?.trim().startsWith(label),
    );
  }

  function button(label: string): HTMLButtonElement {
    const found = buttons(label)[0];
    expect(found, `botão "${label}" não encontrado`).toBeTruthy();
    return found;
  }

  it('funções puras', () => {
    expect(qrSrc('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
    expect(qrSrc('AAA')).toBe('data:image/png;base64,AAA');
    expect(formatPhone('5531999999999')).toBe('+55 31 99999-9999');
    expect(formatPhone('123')).toBe('123');
  });

  it('desconectado mostra Conectar, que pede a conexão', async () => {
    await open(status('disconnected'));
    expect(text()).toContain('Nenhum número conectado');

    button('Conectar').click();
    http
      .expectOne(`${API_BASE_URL}/whatsapp/connect`)
      .flush(status('connecting', { qrcode: 'AAA' }));
    await tick();

    expect(
      host().querySelector('img[alt="QR code para conectar o WhatsApp"]')?.getAttribute('src'),
    ).toBe('data:image/png;base64,AAA');
    expect(text()).toContain('Conectar aparelho');
  });

  it('erro ao conectar mostra a mensagem da API', async () => {
    await open(status('disconnected'));

    button('Conectar').click();
    http
      .expectOne(`${API_BASE_URL}/whatsapp/connect`)
      .flush({ message: 'Limite de conexões' }, { status: 503, statusText: 'Unavailable' });
    await tick();

    expect(host().querySelector('[role="alert"]')?.textContent).toContain('Limite de conexões');
    expect(button('Conectar')).toBeTruthy();
  });

  it('aguardando leitura consulta o status sozinho e vira Conectado', async () => {
    vi.useFakeTimers();
    await open(status('connecting', { qrcode: 'AAA' }));

    vi.advanceTimersByTime(POLL_MS);
    http
      .expectOne(STATUS_URL)
      .flush(status('connected', { phone: '5531999999999', profileName: 'Cantinho' }));
    await tick();

    expect(text()).toContain('+55 31 99999-9999');
    expect(text()).toContain('Cantinho');

    vi.advanceTimersByTime(POLL_MS * 3);
    http.expectNone(STATUS_URL); // parou de consultar
  });

  it('QR que expira volta para Conectar e para de consultar', async () => {
    vi.useFakeTimers();
    await open(status('connecting', { qrcode: 'AAA' }));

    vi.advanceTimersByTime(POLL_MS);
    http.expectOne(STATUS_URL).flush(status('disconnected'));
    await tick();

    expect(button('Conectar')).toBeTruthy();

    vi.advanceTimersByTime(POLL_MS * 3);
    http.expectNone(STATUS_URL);
  });

  it('sem QR ainda mostra que está gerando', async () => {
    vi.useFakeTimers();
    await open(status('connecting'));

    expect(text()).toContain('Gerando QR code');
    expect(host().querySelector('img')).toBeNull();
  });

  it('desconectar pede confirmação', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await open(status('connected', { phone: '5531999999999' }));

    button('Desconectar').click();
    expect(confirm).toHaveBeenCalled();
    http.expectOne(`${API_BASE_URL}/whatsapp/disconnect`).flush(status('disconnected'));
    await tick();

    expect(button('Conectar')).toBeTruthy();
  });

  it('desconectar recusado na confirmação não chama a API', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await open(status('connected', { phone: '5531999999999' }));

    button('Desconectar').click();

    http.expectNone(`${API_BASE_URL}/whatsapp/disconnect`);
  });

  it('não configurado explica e não oferece botões de conexão', async () => {
    await open(status('not_configured'));

    expect(text()).toContain('O WhatsApp não está configurado no servidor');
    expect(buttons('Conectar')).toHaveLength(0);
  });

  it('inalcançável deixa tentar de novo', async () => {
    await open(status('unreachable'));
    expect(text()).toContain('Não foi possível falar com o WhatsApp agora.');

    button('Tentar de novo').click();
    http.expectOne(STATUS_URL).flush(status('connected', { phone: '5531999999999' }));
    await tick();

    expect(text()).toContain('+55 31 99999-9999');
  });

  it('sem falhas diz isso', async () => {
    await open(status('connected', { phone: '5531999999999' }));

    expect(text()).toContain('Nenhuma mensagem com falha.');
  });

  it('reenviar com sucesso tira a linha; com falha mostra o motivo novo', async () => {
    const failures = [
      failure(),
      failure({
        id: 'm2',
        recipientName: 'Bia',
        error: 'Envio interrompido',
        createdAt: '2026-10-22T09:00:00',
      }),
    ];
    await open(status('connected', { phone: '5531999999999' }), failures);

    buttons('Reenviar')[0].click();
    http
      .expectOne(`${API_BASE_URL}/whatsapp/messages/m1/resend`)
      .flush({ id: 'm1', status: 'sent', error: null });
    await tick();
    expect(text()).not.toContain('Ana');

    buttons('Reenviar')[0].click();
    http
      .expectOne(`${API_BASE_URL}/whatsapp/messages/m2/resend`)
      .flush({ id: 'm2', status: 'failed', error: 'WhatsApp não conectado' });
    await tick();

    expect(text()).toContain('Bia');
    expect(text()).toContain('WhatsApp não conectado');
  });

  it('desabilita os botões da linha enquanto a ação roda', async () => {
    await open(status('connected', { phone: '5531999999999' }), [failure()]);

    buttons('Reenviar')[0].click();
    fixture.detectChanges();

    expect(buttons('Reenviar')[0].disabled).toBe(true);
    expect(buttons('Descartar')[0].disabled).toBe(true);

    http
      .expectOne(`${API_BASE_URL}/whatsapp/messages/m1/resend`)
      .flush({ id: 'm1', status: 'sent', error: null });
    await tick();
  });

  it('descartar pede confirmação e tira a linha', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await open(status('connected'), [failure({ error: 'x' })]);

    button('Descartar').click();
    const request = http.expectOne(`${API_BASE_URL}/whatsapp/messages/m1/discard`);
    expect(request.request.method).toBe('PATCH');
    request.flush(null);
    await tick();

    expect(text()).toContain('Nenhuma mensagem com falha.');
  });

  it('descartar recusado na confirmação mantém a linha e não chama a API', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await open(status('connected'), [failure()]);

    button('Descartar').click();

    http.expectNone(`${API_BASE_URL}/whatsapp/messages/m1/discard`);
    expect(text()).toContain('Ana');
  });
});
