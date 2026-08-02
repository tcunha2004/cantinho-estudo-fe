import { UserRole } from '../model/entity/user.model';

/** Rota inicial de cada papel: destino após o login e dos redirecionamentos das guardas. */
export const HOME_BY_ROLE: Record<UserRole, string> = {
  admin: '/painel',
  professor: '/agenda',
  student: '/agenda',
};
