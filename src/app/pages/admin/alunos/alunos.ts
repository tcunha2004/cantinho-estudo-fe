import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { StudentService } from '../../../service/student.service';
import { Card } from '../../../shared/card/card';
import { CONTRACT_STATUS_DISPLAY, PLAN_DISPLAY } from '../../../shared/domain-display';
import { Icon } from '../../../shared/icon/icon';
import { initials } from '../../../shared/initials';
import { PageHeader } from '../../../shared/page-header/page-header';

@Component({
  selector: 'app-alunos',
  imports: [Card, Icon, PageHeader, CurrencyPipe],
  templateUrl: './alunos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Alunos {
  private readonly studentService = inject(StudentService);

  protected readonly planDisplay = PLAN_DISPLAY;
  protected readonly contractStatus = CONTRACT_STATUS_DISPLAY;
  protected readonly initials = initials;

  protected readonly search = signal('');
  protected readonly students = toSignal(this.studentService.getActive(), { initialValue: [] });

  protected readonly visibleStudents = computed(() => {
    const term = this.search().trim().toLowerCase();
    const students = this.students();

    return term
      ? students.filter((student) => student.name.toLowerCase().includes(term))
      : students;
  });
}
