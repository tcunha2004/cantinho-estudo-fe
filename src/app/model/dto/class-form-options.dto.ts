import { NamedRef } from './agenda-class.dto';

export interface TeacherOption extends NamedRef {
  /* Matérias que o professor leciona — ele só pode dar aula delas. */
  subjects: NamedRef[];
}

/*
 * Opções dos selects do formulário de aula, já escopadas pelo papel: o admin
 * recebe `teachers` (cada um com as próprias matérias, então trocar de
 * professor não custa outra requisição); o professor recebe `subjects`.
 */
export interface ClassFormOptionsDto {
  teachers: TeacherOption[];
  subjects: NamedRef[];
  students: NamedRef[];
}
