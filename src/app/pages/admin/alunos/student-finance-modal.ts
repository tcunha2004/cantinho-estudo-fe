import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { PaymentHistoryDto } from '../../../model/dto/payment-history.dto';
import { StudentDetailDto } from '../../../model/dto/student-detail.dto';
import { StudentService } from '../../../service/student.service';
import {
  CONTRACT_STATUS_DISPLAY,
  PAYMENT_STATUS_DISPLAY,
  PLAN_DISPLAY,
} from '../../../shared/domain-display';
import { Modal } from '../../../shared/modal/modal';
import { CurrencyPipe, DatePipe } from '@angular/common';

type Contract = StudentDetailDto['contracts'][number];

/* Um contrato com as parcelas que pertencem a ele. */
interface ContractGroup {
  contract: Contract | null;
  payments: PaymentHistoryDto[];
  total: number;
}

/**
 * Histórico financeiro completo de um aluno para o admin: todos os contratos
 * (ativos e cancelados) e as parcelas de cada um. Só leitura — editar contrato
 * continua sendo no `StudentDetailModal`, que abre este.
 */
@Component({
  selector: 'app-student-finance-modal',
  imports: [CurrencyPipe, DatePipe, Modal],
  templateUrl: './student-finance-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentFinanceModal {
  readonly studentId = input.required<string>();

  readonly closed = output<void>();

  private readonly studentService = inject(StudentService);
  private readonly modal = viewChild.required(Modal);

  protected readonly planDisplay = PLAN_DISPLAY;
  protected readonly contractStatus = CONTRACT_STATUS_DISPLAY;
  protected readonly paymentStatus = PAYMENT_STATUS_DISPLAY;

  protected readonly student = rxResource({
    params: () => this.studentId(),
    stream: ({ params }) => this.studentService.getById(params),
  });

  protected readonly payments = rxResource({
    params: () => this.studentId(),
    stream: ({ params }) => this.studentService.getPayments(params),
    defaultValue: [],
  });

  protected readonly loading = computed(
    () => this.student.isLoading() || this.payments.isLoading(),
  );

  /* Somatórios do topo — `amount` é decimal em string, vindo do backend. */
  protected readonly totals = computed(() => {
    const payments = this.payments.value();
    const sum = (status: PaymentHistoryDto['status']) =>
      payments
        .filter((payment) => payment.status === status)
        .reduce((acc, payment) => acc + Number(payment.amount), 0);

    return {
      paid: sum('paid'),
      pending: sum('pending'),
      overdue: sum('overdue'),
      count: payments.length,
    };
  });

  /*
   * Parcelas agrupadas pelo contrato a que pertencem, na ordem dos contratos
   * (mais recente primeiro, como o backend devolve). Parcela cujo contrato não
   * veio na lista cai num grupo sem contrato — defensivo, não deve acontecer.
   */
  protected readonly groups = computed<ContractGroup[]>(() => {
    const contracts = this.student.value()?.contracts ?? [];
    const payments = this.payments.value();
    const ids = new Set(contracts.map((contract) => contract.id));

    const groups: ContractGroup[] = contracts.map((contract) =>
      this.toGroup(
        contract,
        payments.filter((payment) => payment.contractId === contract.id),
      ),
    );

    const orphans = payments.filter((payment) => !ids.has(payment.contractId));

    return orphans.length ? [...groups, this.toGroup(null, orphans)] : groups;
  });

  protected close(): void {
    this.modal().close();
  }

  private toGroup(contract: Contract | null, payments: PaymentHistoryDto[]): ContractGroup {
    return {
      contract,
      payments,
      total: payments.reduce((acc, payment) => acc + Number(payment.amount), 0),
    };
  }
}
