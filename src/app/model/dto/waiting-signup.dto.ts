import { Frequency, PlanType } from '../entity/plan.model';
import { SignupGuardian } from '../entity/signup-link.model';
import { Subject } from '../entity/subject.model';

/* O que todo cadastro aguardando tem, seja de aluno ou de professor. */
interface WaitingSignupBase {
  id: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string | null;
}

export interface WaitingStudentSignup extends WaitingSignupBase {
  role: 'student';
  studentPhone: string;
  studentAddress: string | null;
  regionName: string;
  /* Taxa de matrícula da região — cobrada fora do sistema, aqui é informativa. */
  enrollmentFee: string;
  planId: string;
  planType: PlanType;
  frequency: Frequency | null;
  monthlyPrice: string;
  /* Preço real só na avulsa; nos planos mensais é referência. */
  hourPrice: string;
  classesCount: number | null;
  validityMonths: number | null;
  guardians: SignupGuardian[];
}

export interface WaitingTeacherSignup extends WaitingSignupBase {
  role: 'professor';
  /* Apresentação escrita pelo próprio professor. */
  bio: string;
  subjects: Pick<Subject, 'id' | 'name'>[];
}

/*
 * Um cadastro aguardando aprovação, como o modal de notificações mostra. União
 * em vez de um objeto com metade dos campos nulos: `role` é o discriminante, e
 * o template ramifica por ele antes de tocar no que é de um só dos dois.
 */
export type WaitingSignupDto = WaitingStudentSignup | WaitingTeacherSignup;
