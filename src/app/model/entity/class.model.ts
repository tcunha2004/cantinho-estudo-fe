/* Espelha o JSON serializado de ClassEntity — não a entity do TypeORM.
 * Datas chegam como string ingênua de São Paulo, sem sufixo de fuso
 * ('2026-08-10T14:30:00'), e decimais como string (comportamento do driver). */

import { StudentContract } from './student-contract.model';
import { Teacher } from './teacher.model';
import { Subject } from './subject.model';
import { Region } from './region.model';

export type ClassStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

/* Onde a aula acontece: 'home' = casa do aluno, 'school' = no Cantinho. */
export type LocationType = 'home' | 'school';

export interface Class {
  id: string;
  studentContract: StudentContract;
  teacher: Teacher;
  subject: Subject;
  /* Região da aula, congelada na conclusão (aluno pode trocar de região depois) */
  region: Region | null;
  scheduledAt: string;
  durationMinutes: number;
  locationType: LocationType;
  status: ClassStatus;
  /* Comissão do professor, congelada na conclusão da aula */
  commissionAmount: string | null;
  /* Valor cobrado do aluno pela aula, congelado na conclusão */
  amountCharged: string | null;
  notes: string | null;
}
