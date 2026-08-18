import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { StudentService } from '../../../service/student.service';
import { StudentDetailModal } from './student-detail-modal';
import { Card } from '../../../shared/card/card';
import { CONTRACT_STATUS_DISPLAY, PLAN_DISPLAY } from '../../../shared/domain-display';
import { Icon } from '../../../shared/icon/icon';
import { initials } from '../../../shared/initials';
import { PageHeader } from '../../../shared/page-header/page-header';

@Component({
  selector: 'app-alunos',
  imports: [Card, Icon, PageHeader, StudentDetailModal],
  templateUrl: './alunos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Alunos {
  private readonly studentService = inject(StudentService);

  protected readonly planDisplay = PLAN_DISPLAY;
  protected readonly contractStatus = CONTRACT_STATUS_DISPLAY;
  protected readonly initials = initials;

  protected readonly search = signal('');
  protected readonly selectedStudentId = signal<string | null>(null);

  private readonly activeStudents = rxResource({
    params: () => true,
    stream: () => this.studentService.getActive(),
    defaultValue: [],
  });

  protected readonly students = this.activeStudents.value;

  protected readonly visibleStudents = computed(() => {
    const term = this.search().trim().toLowerCase();
    const students = this.students();

    return term
      ? students.filter((student) => student.name.toLowerCase().includes(term))
      : students;
  });

  protected reloadStudents(): void {
    this.activeStudents.reload();
  }
}
