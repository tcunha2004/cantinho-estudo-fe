import { AgendaClassDto } from '../../../model/dto/agenda-class.dto';
import { summarizeUsage } from './plano';

function cls(status: AgendaClassDto['status']): AgendaClassDto {
  return { status } as AgendaClassDto;
}

describe('summarizeUsage', () => {
  it('conta a falta cobrada como aula usada, e a cancelada não', () => {
    const usage = summarizeUsage(
      [cls('completed'), cls('completed'), cls('no_show'), cls('cancelled')],
      10,
    );

    expect(usage).toMatchObject({ completed: 2, noShow: 1, used: 3, remaining: 7, percent: 30 });
  });

  it('aula agendada ainda não consumiu o plano', () => {
    const usage = summarizeUsage([cls('completed'), cls('scheduled'), cls('scheduled')], 10);

    expect(usage).toMatchObject({ used: 1, scheduled: 2, remaining: 9 });
  });

  it('estourar o plano não passa de 100% nem deixa o resto negativo', () => {
    const usage = summarizeUsage([cls('completed'), cls('completed'), cls('no_show')], 2);

    expect(usage).toMatchObject({ used: 3, remaining: 0, percent: 100 });
  });

  it('sem pacote contratado (avulsa) não há resto nem barra', () => {
    const usage = summarizeUsage([cls('completed'), cls('completed')], null);

    expect(usage).toMatchObject({ used: 2, total: null, remaining: null, percent: 0 });
  });

  it('mês sem aula nenhuma zera tudo', () => {
    expect(summarizeUsage([], 8)).toMatchObject({ used: 0, remaining: 8, percent: 0 });
  });
});
