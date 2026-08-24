import { AbstractControl, ValidationErrors } from '@angular/forms';

/** As duas senhas têm que bater — validação do grupo, não de um campo só. */
export function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { password, passwordConfirm } = group.value as Record<string, string>;
  return !password || password === passwordConfirm ? null : { passwordMismatch: true };
}
