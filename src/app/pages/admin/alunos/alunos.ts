import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SignupLinkService } from '../../../service/signup-link.service';
import { StudentService } from '../../../service/student.service';
import { SignupLinkModal } from '../signup-link-modal';
import { StudentDetailModal } from './student-detail-modal';
import { Card } from '../../../shared/card/card';
import {
  CONTRACT_STATUS_DISPLAY,
  PLAN_DISPLAY,
  STUDENT_STATUS_DISPLAY,
} from '../../../shared/domain-display';
import { Icon } from '../../../shared/icon/icon';
import { initials } from '../../../shared/initials';
import { PageHeader } from '../../../shared/page-header/page-header';

@Component({
  selector: 'app-alunos',
  imports: [Card, Icon, PageHeader, SignupLinkModal, StudentDetailModal],
  templateUrl: './alunos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Alunos {
  private readonly studentService = inject(StudentService);
  private readonly signupLinkService = inject(SignupLinkService);

  protected readonly planDisplay = PLAN_DISPLAY;
  protected readonly studentStatus = STUDENT_STATUS_DISPLAY;
  protected readonly initials = initials;

  protected readonly search = signal('');
  protected readonly selectedStudentId = signal<string | null>(null);
  protected readonly creatingLink = signal(false);

  /* Refaz a busca quando um cadastro é aprovado pelo sino — o aluno novo
   * precisa aparecer aqui sem depender de o admin recarregar a página. */
  private readonly activeStudents = rxResource({
    params: () => this.signupLinkService.approvals(),
    stream: () => this.studentService.getAll(),
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
