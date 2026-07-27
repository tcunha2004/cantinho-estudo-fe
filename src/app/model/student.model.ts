/* Espelha o JSON serializado de StudentEntity. */

import { User } from './user.model';
import { Region } from './region.model';
import { StudentContract } from './student-contract.model';
import { Guardian } from './guardian.model';

export interface Student {
  id: string;
  user: User;
  region: Region;
  phone: string;
  /* Endereço para aulas em casa */
  address: string | null;
  active: boolean;
  /* Coleções inversas — presentes só quando o endpoint as carrega */
  contracts?: StudentContract[];
  guardians?: Guardian[];
}
