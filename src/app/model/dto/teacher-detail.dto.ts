/* Espelha o TeacherDetailDto do backend — dados completos de um professor
 * para o modal de visualização/edição do admin. */
export interface TeacherDetailDto {
  id: string;
  name: string;
  email: string;
  /* Apresentação do professor */
  bio: string | null;
  active: boolean;
  subjects: { id: string; name: string }[];
}
