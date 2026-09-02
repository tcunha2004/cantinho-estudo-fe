import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../service/api.config';
import { monthRange } from '../../../shared/month';
import { Aulas } from './aulas';

/*
 * O que importa nesta tela é o range inicial (mês corrente, sem paginação
 * manual) e o `studentId` só entrar na query quando o filtro está preenchido
 * — sem isso a API filtraria por um aluno vazio em vez de trazer todos.
 */
describe('Aulas do admin', () => {
  let fixture: ComponentFixture<Aulas>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Aulas);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('parte do mês corrente e não envia studentId sem filtro', () => {
    const { from, to } = monthRange();

    const request = http.expectOne((req) => req.url === `${API_BASE_URL}/classes/agenda`);
    expect(request.request.params.get('from')).toBe(from);
    expect(request.request.params.get('to')).toBe(to);
    expect(request.request.params.has('studentId')).toBe(false);
    request.flush([]);

    http.expectOne(`${API_BASE_URL}/students/all`).flush([]);
  });

  it('inclui studentId na query quando um aluno é selecionado', () => {
    http.expectOne((req) => req.url === `${API_BASE_URL}/classes/agenda`).flush([]);
    http.expectOne(`${API_BASE_URL}/students/all`).flush([]);

    fixture.componentInstance['studentFilter'].set('s1');
    fixture.detectChanges();

    const request = http.expectOne((req) => req.url === `${API_BASE_URL}/classes/agenda`);
    expect(request.request.params.get('studentId')).toBe('s1');
    request.flush([]);
  });
});
