/* Espelha o JSON serializado de GuardianEntity. */

import { Student } from './student.model';

export interface Guardian {
  id: string;
  student: Student;
  name: string;
  phone: string;
  cpf: string;
  rg: string | null;
  /* Indica se este responsável é o responsável financeiro do aluno */
  isFinancialResponsible: boolean;
}
