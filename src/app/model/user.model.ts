/* Espelha o JSON serializado de UserEntity — não a entity do TypeORM.
 * `password` é @Exclude() no backend, então nunca chega ao FE. */

export type UserRole = 'admin' | 'professor' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
