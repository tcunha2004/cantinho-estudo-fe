import { FormBuilder } from '@angular/forms';
import { passwordsMatch } from './perfil';

function group(newPassword: string, confirmPassword: string) {
  return new FormBuilder().nonNullable.group({ newPassword, confirmPassword });
}

describe('passwordsMatch', () => {
  it('acusa erro quando a confirmação não bate', () => {
    expect(passwordsMatch(group('senha-nova-123', 'senha-nova-124'))).toEqual({ mismatch: true });
  });

  it('aceita confirmação igual', () => {
    expect(passwordsMatch(group('senha-nova-123', 'senha-nova-123'))).toBeNull();
  });

  /* Quem ainda não digitou a confirmação não errou — o `required` do campo cuida disso. */
  it('não acusa erro com a confirmação ainda vazia', () => {
    expect(passwordsMatch(group('senha-nova-123', ''))).toBeNull();
  });

  it('difere maiúsculas de minúsculas', () => {
    expect(passwordsMatch(group('Senha-Nova', 'senha-nova'))).toEqual({ mismatch: true });
  });
});
