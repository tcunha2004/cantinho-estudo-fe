import { PublicRegionPricingDto } from './region-pricing.dto';
import { SignupGuardian, SignupRole } from '../entity/signup-link.model';
import { Subject } from '../entity/subject.model';

/*
 * O que a tela pública de cadastro recebe: o rascunho e a lista que aquele
 * papel usa — preços para o aluno, matérias para o professor.
 */
export interface SignupFormDto {
  id: string;
  /* Aluno ou professor: é o que decide qual formulário a rota mostra. */
  role: SignupRole;
  studentName: string | null;
  studentEmail: string | null;
  studentPhone: string | null;
  studentAddress: string | null;
  regionId: string | null;
  planId: string | null;
  guardians: SignupGuardian[] | null;
  /* Apresentação do professor, escrita por ele. */
  bio: string | null;
  /* Matérias que o professor já escolheu. */
  subjectIds: string[] | null;
  /* Se a pessoa já definiu uma senha — o valor em si nunca volta do backend. */
  hasPassword: boolean;
  /* Sem `classCommission`: a tela pública não vê o que a escola paga ao professor. */
  regions: PublicRegionPricingDto[];
  /* Lista mestra de matérias, para o professor escolher o que leciona. */
  subjects: Pick<Subject, 'id' | 'name'>[];
}

/* Uma fase salva: só o que aquela fase preencheu. */
export interface SignupDraftPayload {
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  studentAddress?: string | null;
  password?: string;
  regionId?: string;
  planId?: string | null;
  guardians?: SignupGuardian[];
  bio?: string | null;
  subjectIds?: string[];
}
