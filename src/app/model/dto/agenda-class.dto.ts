import { ClassStatus, LocationType } from '../entity/class.model';

export interface NamedRef {
  id: string;
  name: string;
}

/*
 * Aula como a grade da agenda a recebe: plana, sem o grafo da entidade.
 * `scheduledAt` e `endsAt` são horários locais sem fuso ('2026-08-10T14:30:00')
 * — o backend guarda a hora do relógio, não um instante em UTC.
 */
export interface AgendaClassDto {
  id: string;
  scheduledAt: string;
  endsAt: string;
  durationMinutes: number;
  status: ClassStatus;
  locationType: LocationType;
  subject: NamedRef;
  teacher: NamedRef;
  student: NamedRef;
}

/* Aula completa, para o modal de detalhes. Valores congelados vêm null para
 * quem não pode vê-los. */
export interface ClassDetailDto extends AgendaClassDto {
  notes: string | null;
  region: string | null;
  commissionAmount: string | null;
  amountCharged: string | null;
  createdAt: string;
  updatedAt: string;
}
