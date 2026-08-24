import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api.config';
import { ClassService } from './class.service';
import { RegionService } from './region.service';
import { StudentContractService } from './student-contract.service';
import { SignupLinkService } from './signup-link.service';
import { StudentService } from './student.service';
import { SubjectService } from './subject.service';
import { TeacherService } from './teacher.service';

/*
 * Contrato HTTP dos serviços: verbo, caminho e corpo de cada chamada. É o que
 * quebra silenciosamente quando um endpoint muda de nome no backend — a tela
 * fica vazia e nada estoura no build.
 */
describe('serviços de API', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /* Consome uma requisição esperada e responde com o corpo dado. */
  function expectCall(method: string, url: string, response: object = {}) {
    const req = http.expectOne(API_BASE_URL + url);
    expect(req.request.method).toBe(method);
    req.flush(response);
    return req;
  }

  describe('StudentService', () => {
    it('lista e conta alunos ativos', () => {
      const service = TestBed.inject(StudentService);

      service.getActive().subscribe();
      expectCall('GET', '/students/active', []);

      let count: number | undefined;
      service.getActiveCount().subscribe((value) => (count = value));
      expectCall('GET', '/students/active/count', { count: 12 });
      /* getField desembrulha `{ count: 12 }` para 12. */
      expect(count).toBe(12);
    });

    it('busca e edita um aluno pelo id', () => {
      const service = TestBed.inject(StudentService);

      service.getById('s1').subscribe();
      expectCall('GET', '/students/s1');

      service.update('s1', { phone: '31999998888', active: false }).subscribe();
      const req = expectCall('PATCH', '/students/s1');
      expect(req.request.body).toEqual({ phone: '31999998888', active: false });
    });

    it('lê plano e pagamentos do aluno logado', () => {
      const service = TestBed.inject(StudentService);

      service.getMyPlan().subscribe();
      expectCall('GET', '/students/me/plan');

      service.getMyPayments().subscribe();
      expectCall('GET', '/students/me/payments', []);
    });
  });

  describe('TeacherService', () => {
    it('desembrulha a contagem de professores ativos', () => {
      const service = TestBed.inject(TeacherService);

      let teachers: number | undefined;
      service.getActiveCount().subscribe((value) => (teachers = value));
      expectCall('GET', '/teachers/active/count', { count: 4 });
      expect(teachers).toBe(4);
    });

    it('pede os ganhos do mês corrente por padrão', () => {
      const service = TestBed.inject(TeacherService);
      const month = new Date().toISOString().slice(0, 7);

      service.getEarningsByMonth().subscribe();
      const req = http.expectOne(
        (request) => request.url === `${API_BASE_URL}/teachers/all/monthly-earnings`,
      );
      expect(req.request.params.get('month')).toBe(month);
      req.flush({ totalCompletedClasses: 0, totalAmountToReceive: 0, teachers: [] });
    });

    it('busca e edita um professor pelo id', () => {
      const service = TestBed.inject(TeacherService);

      service.getById('t1').subscribe();
      expectCall('GET', '/teachers/t1');

      service.update('t1', { subjectIds: ['sub1'] }).subscribe();
      const req = expectCall('PATCH', '/teachers/t1');
      expect(req.request.body).toEqual({ subjectIds: ['sub1'] });
    });
  });

  describe('SubjectService', () => {
    it('busca a lista mestra de matérias', () => {
      TestBed.inject(SubjectService).getAll().subscribe();
      expectCall('GET', '/subjects', []);
    });
  });

  describe('RegionService e StudentContractService', () => {
    it('buscam tabela de preços e contagem por plano', () => {
      TestBed.inject(RegionService).getPricing().subscribe();
      expectCall('GET', '/regions/pricing', []);

      TestBed.inject(StudentContractService).getActiveCountByPlanType().subscribe();
      expectCall('GET', '/student-contracts/active/count-by-plan-type');
    });
  });

  describe('SignupLinkService', () => {
    it('gera o link, lê o rascunho, salva a fase e envia', () => {
      const service = TestBed.inject(SignupLinkService);

      service.create().subscribe();
      expectCall('POST', '/signup-links', { id: 'link-1' });

      service.getForm('link-1').subscribe();
      expectCall('GET', '/signup-links/link-1/form');

      service.saveDraft('link-1', { studentName: 'Ana Souza' }).subscribe();
      const draft = expectCall('PATCH', '/signup-links/link-1');
      expect(draft.request.body).toEqual({ studentName: 'Ana Souza' });

      service.submit('link-1').subscribe();
      expectCall('POST', '/signup-links/link-1/submit');
    });

    it('lista os aguardando e aprova com desconto', () => {
      const service = TestBed.inject(SignupLinkService);

      service.getWaiting().subscribe();
      expectCall('GET', '/signup-links/waiting', []);

      /* O contador só sobe quando a aprovação volta — é o que faz as telas de
       * aluno se atualizarem sem recarregar a página. */
      expect(service.approvals()).toBe(0);

      service.approve('link-1', '10.00').subscribe();
      const approve = expectCall('POST', '/signup-links/link-1/approve', { studentId: 's1' });
      expect(approve.request.body).toEqual({ discountPercentage: '10.00' });
      expect(service.approvals()).toBe(1);
    });
  });

  describe('ClassService', () => {
    it('desembrulha os números do painel', () => {
      const service = TestBed.inject(ClassService);

      let classes: number | undefined;
      service.getCurrentMonthCount().subscribe((value) => (classes = value));
      expectCall('GET', '/classes/current-month/count', { count: 9 });
      expect(classes).toBe(9);

      let revenue: number | undefined;
      service.getCurrentMonthRevenue().subscribe((value) => (revenue = value));
      expectCall('GET', '/classes/current-month/revenue', { revenue: 1320 });
      expect(revenue).toBe(1320);
    });

    it('cria, encerra, marca falta, cancela e reabre pela rota certa', () => {
      const service = TestBed.inject(ClassService);
      const payload = {
        studentId: 's1',
        teacherId: 't1',
        subjectId: 'sub1',
        scheduledAt: '2026-08-10T14:00:00',
        durationMinutes: 60,
        locationType: 'school' as const,
      };

      service.create(payload).subscribe();
      const created = expectCall('POST', '/classes');
      expect(created.request.body).toEqual(payload);

      service.complete('cl1').subscribe();
      expectCall('PATCH', '/classes/cl1/complete');

      service.markNoShow('cl1').subscribe();
      expectCall('PATCH', '/classes/cl1/no-show');

      service.cancel('cl1').subscribe();
      expectCall('PATCH', '/classes/cl1/cancel');

      service.reopen('cl1').subscribe();
      expectCall('PATCH', '/classes/cl1/reopen');
    });

    it('pede a agenda pelo intervalo de dias', () => {
      const service = TestBed.inject(ClassService);

      service.getAgenda({ from: '2026-08-10', to: '2026-08-16' }).subscribe();
      const req = http.expectOne((request) => request.url === `${API_BASE_URL}/classes/agenda`);
      expect(req.request.params.get('from')).toBe('2026-08-10');
      expect(req.request.params.get('to')).toBe('2026-08-16');
      req.flush([]);
    });
  });
});
