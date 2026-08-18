import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { appConfig } from '../../../app.config';
import { API_BASE_URL } from '../../../service/api.config';
import { Painel } from './painel';

/*
 * O painel é a primeira tela do admin: número errado aqui é a reclamação mais
 * barata de aparecer e a mais cara de descobrir depois.
 */
describe('Painel', () => {
  let fixture: ComponentFixture<Painel>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      /* Usa os providers do app (locale pt-BR e BRL) para conferir a formatação. */
      providers: [...appConfig.providers, provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function text(): string {
    /* pt-BR usa espaço não-quebrável depois de "R$". */
    return ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/[\u00a0\u202f]/g, ' ');
  }

  async function render(overrides: Record<string, object> = {}): Promise<void> {
    fixture = TestBed.createComponent(Painel);
    fixture.detectChanges();

    const responses: Record<string, object> = {
      '/students/active/count': { count: 12 },
      '/classes/current-week/count': { count: 9 },
      '/classes/current-month/revenue': { revenue: 1320 },
      '/classes/today/upcoming': [],
      '/student-contracts/active/count-by-plan-type': {
        ouro: 3,
        prata: 1,
        bronze: 0,
        avulsa: 0,
      },
      ...overrides,
    };

    for (const [path, body] of Object.entries(responses)) {
      http.expectOne(API_BASE_URL + path).flush(body);
    }
    /* Ganhos do mês levam query string. */
    http
      .expectOne(
        (request) => request.url === `${API_BASE_URL}/teachers/all/monthly-earnings`,
      )
      .flush({
        totalCompletedClasses: 8,
        totalAmountToReceive: 320,
        teachers: [],
      });

    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  }

  it('mostra os quatro indicadores com dinheiro em reais', async () => {
    await render();

    expect(text()).toContain('Alunos ativos');
    expect(text()).toContain('12');
    expect(text()).toContain('Aulas na semana');
    expect(text()).toContain('9');
    expect(text()).toContain('R$ 1.320,00');
    expect(text()).toContain('R$ 320,00');
  });

  it('não mostra NaN nem undefined quando a API devolve zero', async () => {
    await render({
      '/students/active/count': { count: 0 },
      '/classes/current-week/count': { count: 0 },
      '/classes/current-month/revenue': { revenue: 0 },
    });

    expect(text()).not.toContain('NaN');
    expect(text()).not.toContain('undefined');
    expect(text()).toContain('R$ 0,00');
  });

  it('lista as próximas aulas de hoje com horário, aluno e matéria', async () => {
    await render({
      '/classes/today/upcoming': [
        {
          id: 'cl1',
          scheduledAt: '2026-08-17T14:30:00',
          durationMinutes: 60,
          status: 'scheduled',
          locationType: 'school',
          subject: { id: 'sub1', name: 'Matemática' },
          teacher: { id: 't1', user: { name: 'Renata Lima' } },
          studentContract: { student: { user: { name: 'João Silva' } } },
        },
      ],
    });

    expect(text()).toContain('14:30');
    expect(text()).toContain('João Silva');
    expect(text()).toContain('Matemática');
    expect(text()).toContain('Renata Lima');
  });

  it('avisa quando não há aula hoje', async () => {
    await render();

    expect(text()).toContain('Nenhuma aula agendada para hoje.');
  });

  it('distribui a barra de planos ativos proporcionalmente', async () => {
    await render();

    const bars = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '[style*="width"]',
      ),
    ].map((element) => element.style.width);

    /* 3 ouro + 1 prata = 4 contratos: 75% e 25%. */
    expect(bars.slice(0, 2)).toEqual(['75%', '25%']);
    expect(text()).toContain('3 alunos');
  });

  it('não divide por zero quando nenhum plano tem aluno', async () => {
    await render({
      '/student-contracts/active/count-by-plan-type': {
        ouro: 0,
        prata: 0,
        bronze: 0,
        avulsa: 0,
      },
    });

    expect(text()).not.toContain('NaN');
    const bars = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '[style*="width"]',
      ),
    ].map((element) => element.style.width);
    expect(bars.every((width) => width === '0%')).toBe(true);
  });
});
