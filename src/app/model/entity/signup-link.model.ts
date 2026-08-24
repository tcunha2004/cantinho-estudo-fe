/*
 * Link de cadastro: o admin gera, o aluno preenche por fases e o admin aprova.
 * `waiting` só acontece depois do envio do formulário completo.
 */
export type SignupStatus = 'pending' | 'waiting' | 'approved';

export interface SignupGuardian {
  name: string;
  phone: string;
  cpf: string;
  rg: string | null;
  isFinancialResponsible: boolean;
}
