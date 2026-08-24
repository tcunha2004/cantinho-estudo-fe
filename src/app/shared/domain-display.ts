import { StudentStatus } from '../model/dto/compact-student.dto';
import { ClassStatus } from '../model/entity/class.model';
import { PaymentStatus } from '../model/entity/payment.model';
import { PlanType } from '../model/entity/plan.model';
import { ContractStatus } from '../model/entity/student-contract.model';
import { todayNaive } from './naive-date';

/*
 * Como cada enum do domínio aparece na tela: rótulo em português e as classes
 * Tailwind da cor. Antes cada página tinha a sua cópia — e elas divergiam
 * ("Vencido" x "Expirado"). Aqui é a fonte única: mudou aqui, mudou no app.
 */

export interface PlanDisplay {
  label: string;
  /* Fundo sólido — barras e marcadores */
  bar: string;
  /* Pílula: fundo tênue + texto na cor do plano */
  badge: string;
  /* Texto na cor do plano */
  text: string;
  /* Fundo tênue de seções em destaque */
  tint: string;
}

export const PLAN_DISPLAY: Record<PlanType, PlanDisplay> = {
  ouro: {
    label: 'Ouro',
    bar: 'bg-subject-amber',
    badge: 'bg-subject-amber/15 text-subject-amber',
    text: 'text-subject-amber',
    tint: 'bg-subject-amber/12',
  },
  prata: {
    label: 'Prata',
    bar: 'bg-slate-400',
    badge: 'bg-slate-400/20 text-slate-500',
    text: 'text-slate-500',
    tint: 'bg-slate-400/12',
  },
  bronze: {
    label: 'Bronze',
    bar: 'bg-amber-700',
    badge: 'bg-amber-700/15 text-amber-700',
    text: 'text-amber-700',
    tint: 'bg-amber-700/12',
  },
  avulsa: {
    label: 'Avulso',
    bar: 'bg-accent',
    badge: 'bg-accent-soft text-accent',
    text: 'text-accent',
    tint: 'bg-accent-soft',
  },
};

/*
 * Como o preço de um plano é cobrado. Não é sempre mensalidade: a avulsa é por
 * aula (o `monthlyPrice` dela repete o valor da hora e nunca vira mensalidade —
 * ver `monthlyAmount` no backend) e o Bronze é um pacote de parcela única. É a
 * mesma leitura que a tela Informações faz, agora em um lugar só.
 */
export interface PlanPriceView {
  /* Valor que o aluno paga de fato, sem desconto. */
  amount: number;
  /* Como esse valor é cobrado. */
  suffix: string;
  /* O que o plano entrega. */
  detail: string;
  /* `hourPrice` é preço real só na avulsa; nos demais é referência. */
  showsHourReference: boolean;
}

export function planPriceView(plan: {
  planType: PlanType;
  monthlyPrice: string;
  hourPrice: string;
  classesCount: number | null;
  validityMonths: number | null;
}): PlanPriceView {
  if (plan.planType === 'avulsa') {
    return {
      amount: Number(plan.hourPrice),
      suffix: 'por aula',
      detail: 'Aula individual, sem plano',
      showsHourReference: false,
    };
  }

  if (plan.planType === 'bronze') {
    return {
      amount: Number(plan.monthlyPrice),
      suffix: 'parcela única',
      detail: `Pacote de ${plan.classesCount} aulas · validade de ${plan.validityMonths} meses`,
      showsHourReference: true,
    };
  }

  return {
    amount: Number(plan.monthlyPrice),
    suffix: 'por mês',
    detail: `${plan.classesCount} aulas no mês`,
    showsHourReference: true,
  };
}

export const STUDENT_STATUS_DISPLAY: Record<StudentStatus, { label: string; badge: string }> = {
  active: { label: 'Ativo', badge: 'bg-subject-green/15 text-subject-green' },
  inactive: { label: 'Inativo', badge: 'bg-slate-200 text-slate-500' },
};

export const CONTRACT_STATUS_DISPLAY: Record<ContractStatus, { label: string; badge: string }> = {
  active: { label: 'Ativo', badge: 'bg-subject-green/15 text-subject-green' },
  cancelled: { label: 'Cancelado', badge: 'bg-subject-amber/15 text-subject-amber' },
};

export const CLASS_STATUS_DISPLAY: Record<
  ClassStatus,
  { label: string; bar: string; badge: string }
> = {
  scheduled: {
    label: 'Agendada',
    bar: 'bg-subject-blue',
    badge: 'bg-subject-blue/15 text-subject-blue',
  },
  completed: {
    label: 'Realizada',
    bar: 'bg-subject-green',
    badge: 'bg-subject-green/15 text-subject-green',
  },
  cancelled: {
    label: 'Cancelada',
    bar: 'bg-subject-amber',
    badge: 'bg-subject-amber/15 text-subject-amber',
  },
  /* Aluno faltou sem avisar: a aula é cobrada e o professor recebe a comissão. */
  no_show: {
    label: 'Falta (cobrada)',
    bar: 'bg-accent',
    badge: 'bg-accent-soft text-accent',
  },
};

export const PAYMENT_STATUS_DISPLAY: Record<PaymentStatus, { label: string; badge: string }> = {
  pending: { label: 'Em aberto', badge: 'bg-subject-amber/15 text-subject-amber' },
  paid: { label: 'Pago', badge: 'bg-subject-green/15 text-subject-green' },
  cancelled: { label: 'Cancelado', badge: 'bg-slate-200 text-slate-500' },
};

/*
 * Como a parcela aparece para quem só lê o status. "Em aberto" é o status no
 * banco, mas a partir do dia seguinte ao vencimento a parcela está em atraso —
 * e é isso que o aluno precisa ver. Comparação por string, no formato ingênuo
 * do backend (ver naive-date).
 *
 * O `PAYMENT_STATUS_DISPLAY` cru continua servindo o seletor de status do modal
 * financeiro do admin, onde "Em aberto" é uma opção escolhível, não um rótulo.
 */
export function paymentStatusDisplay(
  status: PaymentStatus,
  dueDate: string,
): { label: string; badge: string } {
  return status === 'pending' && dueDate < todayNaive()
    ? { label: 'Em atraso', badge: 'bg-accent-soft text-accent' }
    : PAYMENT_STATUS_DISPLAY[status];
}
