/* Espelha o JSON serializado de TeacherEntity. */

import { User } from './user.model';
import { Subject } from './subject.model';
import { Class } from './class.model';

export interface Teacher {
  id: string;
  user: User;
  /* Apresentação do professor */
  bio: string | null;
  /* Coleções — presentes só quando o endpoint as carrega */
  subjects?: Subject[];
  classes?: Class[];
}
