/* Espelha o JSON serializado de InviteLinkEntity. */

import { User } from './user.model';

/* Perfil que o link de convite habilita no cadastro. */
export type TargetRole = 'professor' | 'student';

export interface InviteLink {
  id: string;
  createdBy: User;
  token: string;
  targetRole: TargetRole;
  /* Percentual de desconto — null se sem desconto */
  discountPercentage: string | null;
  expiresAt: string;
  used: boolean;
}
