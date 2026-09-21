import { LOCATION_TYPE_DISPLAY, paymentStatusDisplay } from './domain-display';
import { todayNaive } from './naive-date';

/* Datas relativas a hoje: o rótulo depende da comparação com a data corrente. */
function shift(days: number): string {
  const date = new Date(`${todayNaive()}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

describe('paymentStatusDisplay', () => {
  it('parcela em aberto que ainda vai vencer fica "Em aberto"', () => {
    expect(paymentStatusDisplay('pending', shift(1)).label).toBe('Em aberto');
  });

  it('parcela em aberto que vence hoje ainda não está em atraso', () => {
    expect(paymentStatusDisplay('pending', todayNaive()).label).toBe('Em aberto');
  });

  it('parcela em aberto com vencimento passado fica "Em atraso"', () => {
    expect(paymentStatusDisplay('pending', shift(-1)).label).toBe('Em atraso');
  });

  it('parcela paga ou cancelada não vira atraso, mesmo vencida', () => {
    expect(paymentStatusDisplay('paid', shift(-30)).label).toBe('Pago');
    expect(paymentStatusDisplay('cancelled', shift(-30)).label).toBe('Cancelado');
  });
});

describe('LOCATION_TYPE_DISPLAY', () => {
  it('aula na casa do aluno aparece como "Domiciliar"', () => {
    expect(LOCATION_TYPE_DISPLAY.home.label).toBe('Domiciliar');
  });

  it('aula na sede aparece como "No Cantinho"', () => {
    expect(LOCATION_TYPE_DISPLAY.school.label).toBe('No Cantinho');
  });
});
