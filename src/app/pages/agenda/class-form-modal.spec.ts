import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ClassFormModal } from './class-form-modal';
import { ClassFormOptionsDto } from '../../model/dto/class-form-options.dto';
import { ClassDetailDto } from '../../model/dto/agenda-class.dto';

const OPTIONS = { teachers: [], students: [], subjects: [] } as unknown as ClassFormOptionsDto;

/* Aula já gravada com uma duração que saiu da lista de opções. */
function aulaDe(durationMinutes: number): ClassDetailDto {
  return {
    id: 'c1',
    scheduledAt: '2026-08-10T14:00:00',
    durationMinutes,
    locationType: 'school',
    status: 'scheduled',
    notes: null,
    teacher: { id: 't1', name: 'Ana' },
    student: { id: 's1', name: 'Bia' },
    subject: { id: 'm1', name: 'Matemática' },
  } as unknown as ClassDetailDto;
}

describe('ClassFormModal · durações', () => {
  /* jsdom não implementa <dialog>.showModal(); o modal só precisa não estourar.
   * Mesmo polyfill usado em student-finance-modal.spec.ts e signup-link-modal.spec.ts. */
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    };
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('oferece 45, 60, 90, 120 e 180 minutos', () => {
    const fixture = TestBed.createComponent(ClassFormModal);
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.detectChanges();

    expect(fixture.componentInstance['durations']()).toEqual([45, 60, 90, 120, 180]);
  });

  it('preserva a duração de uma aula antiga fora da lista, em ordem', () => {
    const fixture = TestBed.createComponent(ClassFormModal);
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.componentRef.setInput('initial', aulaDe(30));
    fixture.detectChanges();

    expect(fixture.componentInstance['durations']()).toEqual([30, 45, 60, 90, 120, 180]);
    expect(fixture.componentInstance['form'].controls.durationMinutes.value).toBe(30);
  });

  it('não duplica quando a duração da aula já está na lista', () => {
    const fixture = TestBed.createComponent(ClassFormModal);
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.componentRef.setInput('initial', aulaDe(90));
    fixture.detectChanges();

    expect(fixture.componentInstance['durations']()).toEqual([45, 60, 90, 120, 180]);
  });
});
