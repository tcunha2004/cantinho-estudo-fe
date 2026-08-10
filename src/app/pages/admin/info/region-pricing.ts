/* Uma linha da tabela do Plano Ouro (uma frequência semanal). */
interface OuroRow {
  frequency: string;
  monthly: string;
  perLesson: string;
}

/* Planos de pacote (Prata e Bronze): valor fechado + valor da hora-aula. */
interface PackagePlan {
  total: string;
  perLesson: string;
}

/* Tabela de preços completa de uma região. */
export interface RegionPricing {
  slug: string;
  name: string;
  ouro: OuroRow[];
  prata: PackagePlan;
  bronze: PackagePlan;
  /* Valor da aula individual sem plano */
  avulsa: string;
  /* Taxa de matrícula dos planos Ouro e Prata */
  enrollmentFee: string;
}

/* Tabela comercial vigente. Ainda não vem da API — editar aqui atualiza a tela. */
export const REGION_PRICING: RegionPricing[] = [
  {
    slug: 'vila-da-serra',
    name: 'Vila da Serra',
    ouro: [
      { frequency: '2x na semana', monthly: 'R$ 1.320', perLesson: 'R$ 165' },
      { frequency: '3x na semana', monthly: 'R$ 1.860', perLesson: 'R$ 155' },
      { frequency: '5x na semana', monthly: 'R$ 2.900', perLesson: 'R$ 145' },
    ],
    prata: { total: 'R$ 1.800', perLesson: 'R$ 180' },
    bronze: { total: 'R$ 2.000', perLesson: 'R$ 200' },
    avulsa: 'R$ 220',
    enrollmentFee: 'R$ 200',
  },
  {
    slug: 'cidade-nova',
    name: 'Cid. Nova e Região',
    ouro: [
      { frequency: '2x na semana', monthly: 'R$ 760', perLesson: 'R$ 95' },
      { frequency: '3x na semana', monthly: 'R$ 1.020', perLesson: 'R$ 85' },
      { frequency: '5x na semana', monthly: 'R$ 1.500', perLesson: 'R$ 75' },
    ],
    prata: { total: 'R$ 1.100', perLesson: 'R$ 110' },
    bronze: { total: 'R$ 1.250', perLesson: 'R$ 125' },
    avulsa: 'R$ 150',
    enrollmentFee: 'R$ 165',
  },
  {
    slug: 'centro-sul',
    name: 'Centro-Sul',
    ouro: [
      { frequency: '2x na semana', monthly: 'R$ 1.080', perLesson: 'R$ 135' },
      { frequency: '3x na semana', monthly: 'R$ 1.500', perLesson: 'R$ 125' },
      { frequency: '5x na semana', monthly: 'R$ 2.300', perLesson: 'R$ 115' },
    ],
    prata: { total: 'R$ 1.550', perLesson: 'R$ 155' },
    bronze: { total: 'R$ 1.750', perLesson: 'R$ 175' },
    avulsa: 'R$ 200',
    enrollmentFee: 'R$ 200',
  },
  {
    slug: 'cantinho',
    name: 'Cantinho',
    ouro: [
      { frequency: '2x na semana', monthly: 'R$ 600', perLesson: 'R$ 75' },
      { frequency: '3x na semana', monthly: 'R$ 840', perLesson: 'R$ 70' },
      { frequency: '5x na semana', monthly: 'R$ 1.300', perLesson: 'R$ 65' },
    ],
    prata: { total: 'R$ 850', perLesson: 'R$ 85' },
    bronze: { total: 'R$ 900', perLesson: 'R$ 90' },
    avulsa: 'R$ 100',
    enrollmentFee: 'R$ 165',
  },
];
