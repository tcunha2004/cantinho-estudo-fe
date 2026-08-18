import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { appConfig } from '../../../app.config';
import { API_BASE_URL } from '../../../service/api.config';
import { CommissionInfoModal } from './commission-info-modal';

/* Comissão por hora de cada região — o que o professor recebe por aula. */
describe('CommissionInfoModal', () => {
  let http: HttpTestingController;

  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render(regions: object[]): Promise<string> {
    const fixture = TestBed.createComponent(CommissionInfoModal);
    fixture.detectChanges();
    http.expectOne(`${API_BASE_URL}/regions/pricing`).flush(regions);
    await Promise.resolve();
    fixture.detectChanges();

    return ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(
      /[  ]/g,
      ' ',
    );
  }

  it('lista cada região com a comissão em reais', async () => {
    const text = await render([
      {
        id: 'r1',
        name: 'Cantinho',
        slug: 'cantinho',
        enrollmentFee: '100.00',
        classCommission: '25.00',
        plans: [],
      },
      {
        id: 'r2',
        name: 'Vila da Serra',
        slug: 'vila-da-serra',
        enrollmentFee: '150.00',
        classCommission: '35.50',
        plans: [],
      },
    ]);

    expect(text).toContain('Cantinho');
    expect(text).toContain('R$ 25,00');
    expect(text).toContain('Vila da Serra');
    expect(text).toContain('R$ 35,50');
  });

  it('avisa quando não há região cadastrada', async () => {
    expect(await render([])).toContain('Nenhuma região cadastrada.');
  });
});
