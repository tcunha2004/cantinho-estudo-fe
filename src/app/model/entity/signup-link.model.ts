import { UserRole } from './user.model';

/*
 * Link de cadastro: o admin gera, a pessoa preenche e o admin aprova.
 * `waiting` só acontece depois do envio do formulário completo.
 */
export type SignupStatus = 'pending' | 'waiting' | 'approved';

/* De quem é o cadastro. Link nunca cria admin. */
export type SignupRole = Exclude<UserRole, 'admin'>;

export interface SignupGuardian {
  name: string;
  phone: string;
  cpf: string;
  rg: string | null;
  isFinancialResponsible: boolean;
}
