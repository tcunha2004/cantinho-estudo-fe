import { ClassStatus } from '../model/entity/class.model';
import { PaymentStatus } from '../model/entity/payment.model';
import { PlanType } from '../model/entity/plan.model';
import { ContractStatus } from '../model/entity/student-contract.model';

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

export const CONTRACT_STATUS_DISPLAY: Record<ContractStatus, { label: string; badge: string }> = {
  active: { label: 'Ativo', badge: 'bg-subject-green/15 text-subject-green' },
  cancelled: { label: 'Cancelado', badge: 'bg-subject-amber/15 text-subject-amber' },
  expired: { label: 'Vencido', badge: 'bg-accent-soft text-accent' },
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
  no_show: {
    label: 'Cancelada (cobrada)',
    bar: 'bg-accent',
    badge: 'bg-accent-soft text-accent',
  },
};

export const PAYMENT_STATUS_DISPLAY: Record<PaymentStatus, { label: string; badge: string }> = {
  pending: { label: 'Em aberto', badge: 'bg-subject-amber/15 text-subject-amber' },
  paid: { label: 'Pago', badge: 'bg-subject-green/15 text-subject-green' },
  overdue: { label: 'Vencido', badge: 'bg-accent-soft text-accent' },
  cancelled: { label: 'Cancelado', badge: 'bg-slate-200 text-slate-500' },
};
