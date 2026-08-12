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
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClassDetailDto } from '../../model/dto/agenda-class.dto';
import { LocationType } from '../../model/entity/class.model';
import { ClassService } from '../../service/class.service';
import { CLASS_STATUS_DISPLAY } from '../../shared/domain-display';
import { Icon } from '../../shared/icon/icon';
import { Modal } from '../../shared/modal/modal';
import { nowNaive } from '../../shared/naive-date';

const LOCATION_LABEL: Record<LocationType, string> = {
  home: 'Casa do aluno',
  school: 'No Cantinho',
};

export type ClassAction = 'complete' | 'no_show' | 'cancel' | 'reopen';

interface ActionCopy {
  question: string;
  detail: string;
  confirm: string;
  pending: string;
  success: string;
}

/*
 * Toda ação que muda o status pede confirmação: três delas mexem em dinheiro
 * (encerrar congela valores, reabrir descongela) e a quarta é irreversível
 * para o professor.
 */
const ACTION_COPY: Record<ClassAction, ActionCopy> = {
  complete: {
    question: 'Marcar esta aula como realizada?',
    detail:
      'O valor da aula e a comissão do professor são calculados agora e ficam registrados — passam a contar na receita e nos ganhos do mês.',
    confirm: 'Marcar realizada',
    pending: 'Salvando…',
    success: 'Aula marcada como realizada.',
  },
  no_show: {
    question: 'Registrar falta do aluno?',
    detail:
      'A aula é cobrada normalmente e o professor recebe a comissão, porque esteve à disposição. Os valores ficam registrados.',
    confirm: 'Registrar falta',
    pending: 'Salvando…',
    success: 'Falta registrada.',
  },
  cancel: {
    question: 'Cancelar esta aula?',
    detail:
      'Ela continua no histórico, marcada como cancelada, sem cobrança nem comissão, e o horário fica livre.',
    confirm: 'Cancelar aula',
    pending: 'Cancelando…',
    success: 'Aula cancelada.',
  },
  reopen: {
    question: 'Reabrir esta aula?',
    detail:
      'Ela volta para "agendada" e o valor cobrado e a comissão já registrados são apagados, saindo dos relatórios do mês.',
    confirm: 'Reabrir aula',
    pending: 'Reabrindo…',
    success: 'Aula reaberta.',
  },
};

/**
 * Detalhes de uma aula. Todos os papéis abrem; professor e admin encerram,
 * cancelam e editam a própria aula, e só o admin reabre uma aula encerrada.
 * O que cada um pode ver dos valores já chega decidido do backend.
 */
@Component({
  selector: 'app-class-details-modal',
  imports: [CurrencyPipe, DatePipe, Icon, Modal],
  templateUrl: './class-details-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassDetailsModal {
  readonly classId = input.required<string>();
  readonly canEdit = input(false);
  readonly isAdmin = input(false);

  readonly closed = output<void>();
  readonly edit = output<ClassDetailDto>();
  readonly changed = output<{ item: ClassDetailDto; message: string }>();

  private readonly classService = inject(ClassService);
  private readonly modal = viewChild.required(Modal);

  protected readonly classStatus = CLASS_STATUS_DISPLAY;
  protected readonly locationLabel = LOCATION_LABEL;
  protected readonly actionCopy = ACTION_COPY;

  protected readonly pending = signal<ClassAction | null>(null);
  protected readonly running = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly item = rxResource({
    params: () => this.classId(),
    stream: ({ params }) => this.classService.getById(params),
  });

  protected readonly isScheduled = computed(() => this.item.value()?.status === 'scheduled');

  /* Encerrar uma aula que ainda não começou não faz sentido — e o backend recusa. */
  protected readonly canFinalize = computed(() => {
    const item = this.item.value();
    return !!item && item.status === 'scheduled' && item.scheduledAt <= nowNaive();
  });

  protected close(): void {
    this.modal().close();
  }

  protected run(action: ClassAction): void {
    const item = this.item.value();

    if (!item || this.running()) {
      return;
    }

    this.running.set(true);
    this.errorMessage.set(null);

    this.request(action, item.id).subscribe({
      next: (updated) => {
        this.running.set(false);
        this.changed.emit({ item: updated, message: ACTION_COPY[action].success });
      },
      error: (error: HttpErrorResponse) => {
        this.running.set(false);
        this.pending.set(null);
        this.errorMessage.set(
          (error.error as { message?: string } | null)?.message ??
            'Não foi possível concluir a ação.',
        );
      },
    });
  }

  private request(action: ClassAction, id: string): Observable<ClassDetailDto> {
    switch (action) {
      case 'complete':
        return this.classService.complete(id);
      case 'no_show':
        return this.classService.markNoShow(id);
      case 'cancel':
        return this.classService.cancel(id);
      case 'reopen':
        return this.classService.reopen(id);
    }
  }
}
