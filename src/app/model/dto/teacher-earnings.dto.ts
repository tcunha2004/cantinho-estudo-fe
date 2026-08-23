export interface TeacherEarningsDto {
  id: string;
  name: string;
  /* Professor inativado pelo admin continua na lista, marcado como inativo */
  active: boolean;
  /* Disciplinas do professor separadas por vírgula (vazio quando não há) */
  subject: string;
  /* Quantidade de aulas concluídas no mês */
  completedClasses: number;
  /* Total a receber no mês (soma das comissões das aulas concluídas) */
  amountToReceive: number;
}
