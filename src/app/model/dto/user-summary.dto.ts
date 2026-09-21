import { UserRole } from '../entity/user.model';

/* Usuário como a tela de senhas do admin o recebe. O hash nunca vem do
 * backend — não existe campo de senha aqui de propósito. */
export interface UserSummaryDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
