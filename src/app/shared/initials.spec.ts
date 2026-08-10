import { initials } from './initials';

describe('initials', () => {
  it('usa o primeiro e o último nome', () => {
    expect(initials('Renata Lima')).toBe('RL');
    expect(initials('Ana Clara de Souza')).toBe('AS');
  });

  it('repete a inicial quando há um nome só', () => {
    expect(initials('Renata')).toBe('RR');
  });

  it('não quebra com nome vazio', () => {
    expect(initials('')).toBe('');
    expect(initials('   ')).toBe('');
  });
});
