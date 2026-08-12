import { CurrencyPipe, DatePipe } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';

/*
 * Os pipes `currency` e `date` só formatam em pt-BR se o locale estiver
 * registrado no bootstrap. Como toda tela depende disso, vale um teste.
 */
/* O pt-BR separa "R$" do valor com espaço não-quebrável; normaliza para comparar. */
const normalize = (value: string | null) => value?.replace(/ /g, ' ');

describe('appConfig · locale pt-BR', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, CurrencyPipe, DatePipe],
    });
  });

  it('formata número em reais', () => {
    const currency = TestBed.inject(CurrencyPipe);

    expect(normalize(currency.transform(1234.5))).toBe('R$ 1.234,50');
  });

  it('formata decimal que chega como string do backend', () => {
    const currency = TestBed.inject(CurrencyPipe);

    expect(normalize(currency.transform('1320.00'))).toBe('R$ 1.320,00');
  });

  it('formata data ISO em português', () => {
    const date = TestBed.inject(DatePipe);

    expect(date.transform('2026-08-06T14:30:00', 'dd/MM')).toBe('06/08');
    expect(date.transform('2026-08-06T14:30:00', 'MMMM')).toBe('agosto');
  });

  /*
   * O backend devolve hora de parede ingênua de São Paulo, sem sufixo de
   * fuso — é assim que o DatePipe deve receber toda data da API. Uma string
   * com `Z` seria reinterpretada como UTC e o pipe a reformataria no fuso
   * pedido, deslocando um horário que já estava correto. Por isso o `Z`
   * nunca pode voltar ao payload (ver naiveTimestampTransformer no backend).
   * O fuso é passado explicitamente ao `transform` (não em `DATE_PIPE_DEFAULT_OPTIONS`,
   * que deslocaria toda tela) só para tornar o teste determinístico, independente
   * do fuso da máquina que roda os testes.
   */
  it('string com Z desloca o horário; string ingênua não', () => {
    const date = TestBed.inject(DatePipe);

    expect(date.transform('2026-08-13T09:00:00', 'HH:mm', '-0300')).toBe('09:00');
    expect(date.transform('2026-08-13T09:00:00.000Z', 'HH:mm', '-0300')).toBe('06:00');
  });
});
