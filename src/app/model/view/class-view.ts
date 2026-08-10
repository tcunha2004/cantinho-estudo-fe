import { Class, ClassStatus } from '../entity/class.model';

/**
 * Projeção plana de `Class` com o que as telas realmente exibem. Evita que os
 * templates naveguem o grafo da entidade (`studentContract.student.user.name`)
 * e dá uma chave estável para o `track` do `@for`.
 */
export interface ClassView {
  id: string;
  scheduledAt: string;
  student: string;
  teacher: string;
  subject: string;
  status: ClassStatus;
}

export function toClassView(item: Class): ClassView {
  return {
    id: item.id,
    scheduledAt: item.scheduledAt,
    student: item.studentContract.student.user.name,
    teacher: item.teacher.user.name,
    subject: item.subject.name,
    status: item.status,
  };
}
