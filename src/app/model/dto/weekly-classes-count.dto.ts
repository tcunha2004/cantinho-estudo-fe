export interface WeeklyClassesCountDto {
  /* Semana dentro do mês de referência */
  week: number;
  /* Aulas do professor na semana — nulo quando a semana ainda não ocorreu */
  count: number | null;
}
