import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../service/api.config';
import { RegionPricingDto } from '../../../model/dto/region-pricing.dto';
import { PlanEditModal } from './plan-edit-modal';

const REGIAO: RegionPricingDto = {
  id: 'r1',
  name: 'Cantinho',
  slug: 'cantinho',
  enrollmentFee: '100.00',
  classCommission: '25.00',
  plans: [
    {
      id: 'p1',
      planType: 'ouro',
      frequency: 2,
      monthlyPrice: '800.00',
      hourPrice: '70.00',
      classesCount: 8,
      validityMonths: null,
    },
    {
      id: 'p2',
      planType: 'prata',
      frequency: null,
      monthlyPrice: '500.00',
      hourPrice: '60.00',
      classesCount: 4,
      validityMonths: null,
    },
  ],
};

describe('PlanEditModal', () => {
  let fixture: ComponentFixture<PlanEditModal>;
  let http: HttpTestingController;

  /* jsdom não implementa <dialog>.showModal(); o modal só precisa não estourar. */
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
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PlanEditModal);
    fixture.componentRef.setInput('region', REGIAO);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('envia só o plano alterado', () => {
    const instance = fixture.componentInstance as unknown as {
      setPlanField: (id: string, field: string, value: string) => void;
      save: () => void;
    };

    instance.setPlanField('p1', 'monthlyPrice', '850');
    fixture.detectChanges();
    instance.save();

    const request = http.expectOne(`${API_BASE_URL}/plans/p1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ monthlyPrice: '850' });
    request.flush({});

    /* p2 não foi tocado — nenhuma requisição para ele. */
    http.expectNone(`${API_BASE_URL}/plans/p2`);
    http.expectNone(`${API_BASE_URL}/regions/r1`);
  });

  it('envia as taxas da região quando elas mudam', () => {
    const instance = fixture.componentInstance as unknown as {
      setRegionField: (field: string, value: string) => void;
      save: () => void;
    };

    instance.setRegionField('enrollmentFee', '120');
    fixture.detectChanges();
    instance.save();

    const request = http.expectOne(`${API_BASE_URL}/regions/r1`);
    expect(request.request.body).toEqual({ enrollmentFee: '120' });
    request.flush({});
  });

  it('sem alteração nenhuma, não chama a API', () => {
    const instance = fixture.componentInstance as unknown as { save: () => void };

    instance.save();

    http.expectNone(`${API_BASE_URL}/plans/p1`);
    http.expectNone(`${API_BASE_URL}/plans/p2`);
    http.expectNone(`${API_BASE_URL}/regions/r1`);
  });
});
