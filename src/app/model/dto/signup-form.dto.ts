import { RegionPricingDto } from './region-pricing.dto';
import { SignupGuardian } from '../entity/signup-link.model';

/* O que a tela pública de cadastro recebe: o rascunho e a tabela de preços. */
export interface SignupFormDto {
  id: string;
  studentName: string | null;
  studentEmail: string | null;
  studentPhone: string | null;
  studentAddress: string | null;
  regionId: string | null;
  planId: string | null;
  guardians: SignupGuardian[] | null;
  /* Se o aluno já definiu uma senha — o valor em si nunca volta do backend. */
  hasPassword: boolean;
  regions: RegionPricingDto[];
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
}
