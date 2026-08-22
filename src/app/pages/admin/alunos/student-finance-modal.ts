import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { PaymentHistoryDto } from '../../../model/dto/payment-history.dto';
import { PaymentStatus } from '../../../model/entity/payment.model';
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

/* Troca de status escolhida no select, aguardando confirmação — nada foi
 * enviado ao backend ainda. */
interface StagedChange {
  paymentId: string;
  status: PaymentStatus;
  originalStatus: PaymentStatus;
  select: HTMLSelectElement;
}

/**
 * Histórico financeiro completo de um aluno para o admin: todos os contratos
 * (ativos e cancelados) e as parcelas de cada um. A única edição aqui é o
 * status da parcela (fechar o que o aluno pagou, em duas etapas — escolher no
 * select e confirmar); editar contrato continua sendo no `StudentDetailModal`,
 * que abre este.
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
  protected readonly statuses = Object.keys(PAYMENT_STATUS_DISPLAY) as PaymentStatus[];

  /* Troca preparada por vez: mexer no select de outra parcela substitui esta,
   * devolvendo o select anterior ao valor original. */
  protected readonly staged = signal<StagedChange | null>(null);
  /* Id da parcela cujo PATCH está em voo — trava o select e os botões dela. */
  protected readonly confirmingId = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly student = rxResource({
    params: () => this.studentId(),
    stream: ({ params }) => this.studentService.getById(params),
  });

  protected readonly payments = rxResource({
    params: () => this.studentId(),
    stream: ({ params }) => this.studentService.getPayments(params),
    defaultValue: [],
  });

  /* Só a primeira carga mostra "Carregando…": no reload depois de confirmar
   * uma troca a tabela continua na tela em vez de piscar. */
  protected readonly loading = computed(
    () => this.student.isLoading() || (this.payments.isLoading() && !this.payments.value().length),
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

  /* Só prepara a troca — nada é enviado até `confirmChange()`. */
  protected stageChange(payment: PaymentHistoryDto, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const status = select.value as PaymentStatus;

    const previous = this.staged();
    if (previous && previous.paymentId !== payment.id) {
      previous.select.value = previous.originalStatus;
    }

    if (status === payment.status) {
      this.staged.set(null);
      return;
    }

    this.staged.set({
      paymentId: payment.id,
      status,
      originalStatus: payment.status,
      select,
    });
  }

  /* Desiste da troca preparada, sem tocar no backend. */
  protected cancelChange(): void {
    const staged = this.staged();

    if (!staged) {
      return;
    }

    staged.select.value = staged.originalStatus;
    this.staged.set(null);
  }

  /* Recarrega tudo em vez de remendar a parcela na lista: `paidAt` e a
   * eventual parcela do mês seguinte vêm do backend, não de otimismo local.
   * Recarrega o aluno também, não só as parcelas: pagar a parcela pode
   * efetivar uma troca de plano agendada, e o agrupamento por contrato usa a
   * lista de contratos do aluno — sem recarregá-la, a parcela nova (já no
   * contrato trocado) não bate com nenhum contrato conhecido e cai em
   * "Parcelas sem contrato listado" até a página ser recarregada na mão. */
  protected confirmChange(): void {
    const staged = this.staged();

    if (!staged) {
      return;
    }

    this.confirmingId.set(staged.paymentId);
    this.errorMessage.set(null);

    this.studentService
      .updatePaymentStatus(this.studentId(), staged.paymentId, staged.status)
      .subscribe({
        next: () => {
          this.confirmingId.set(null);
          this.staged.set(null);
          this.student.reload();
          this.payments.reload();
        },
        error: (error: HttpErrorResponse) => {
          this.confirmingId.set(null);
          this.errorMessage.set(
            (error.error as { message?: string } | null)?.message ??
              'Não foi possível atualizar a parcela. Tente novamente.',
          );
          staged.select.value = staged.originalStatus;
          this.staged.set(null);
        },
      });
  }

  private toGroup(contract: Contract | null, payments: PaymentHistoryDto[]): ContractGroup {
    return {
      contract,
      payments,
      total: payments.reduce((acc, payment) => acc + Number(payment.amount), 0),
    };
  }
}
