import { Frequency, PlanType } from '../entity/plan.model';
import { SignupGuardian } from '../entity/signup-link.model';

/* Um cadastro aguardando aprovação, como o modal de notificações mostra. */
export interface WaitingSignupDto {
  id: string;
  studentName: string;
  studentEmail: string;
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
  submittedAt: string | null;
}
