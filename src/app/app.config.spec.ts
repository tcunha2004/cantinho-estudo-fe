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
});
