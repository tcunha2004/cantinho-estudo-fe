import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ActiveStudentDto } from '../model/dto/active-student.dto';
import { PaymentHistoryDto } from '../model/dto/payment-history.dto';
import { StudentPlanDto } from '../model/dto/student-plan.dto';
import { StudentDetailDto } from '../model/dto/student-detail.dto';
import { ContractStatus } from '../model/entity/student-contract.model';
import { ApiClient } from './api-client';

/* Corpo de edição do aluno pelo admin. Todos os campos opcionais — só o que
 * vier é alterado. `guardian` edita o responsável financeiro (ou o primeiro,
 * se nenhum for financeiro). `planId`/`discountPercentage` não mutam o
 * contrato — o backend cria um substituto e fecha o atual. */
export interface UpdateStudentPayload {
  name?: string;
  email?: string;
  phone?: string;
  address?: string | null;
  regionId?: string;
  active?: boolean;
  contractStatus?: ContractStatus;
  planId?: string;
  discountPercentage?: string | null;
  guardian?: {
    name?: string;
    phone?: string;
    cpf?: string;
    isFinancialResponsible?: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly api = inject(ApiClient);

  getActive(): Observable<ActiveStudentDto[]> {
    return this.api.get<ActiveStudentDto[]>('/students/active');
  }

  getActiveCount(): Observable<number> {
    return this.api.getField<number>('/students/active/count', 'count');
  }

  getById(id: string): Observable<StudentDetailDto> {
    return this.api.get<StudentDetailDto>(`/students/${id}`);
  }

  update(id: string, payload: UpdateStudentPayload): Observable<StudentDetailDto> {
    return this.api.patch<StudentDetailDto>(`/students/${id}`, payload);
  }

  getMyPlan(): Observable<StudentPlanDto> {
    return this.api.get<StudentPlanDto>('/students/me/plan');
  }

  getMyPayments(): Observable<PaymentHistoryDto[]> {
    return this.api.get<PaymentHistoryDto[]>('/students/me/payments');
  }
}
