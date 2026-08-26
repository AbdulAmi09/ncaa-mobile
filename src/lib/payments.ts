import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 30;

export type Payment = {
  id: string;
  amount: number;
  currency: string;
  payment_status: string;
  payment_type: string;
  description: string | null;
  tournament_name: string | null;
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  transaction_reference: string | null;
  receipt_url: string | null;
  arbiter_name: string | null;
  created_at: string;
};

export type PaymentDue = {
  id: string;
  payment_type: string;
  amount: number;
  due_date: string | null;
};

export const TYPE_LABELS: Record<string, string> = {
  annual_dues: 'Annual Dues',
  checkoff: 'Checkoff',
  penalty: 'Penalty',
  donation: 'Donation',
  certification: 'Certification',
  event_registration: 'Event Registration',
};

export function formatNaira(amount: number, currency = 'NGN') {
  if (currency === 'NGN') return `₦${amount.toLocaleString('en-NG')}`;
  return `${currency} ${amount.toLocaleString('en-NG')}`;
}

export async function fetchPaymentsPage(arbiterId: string, before?: string) {
  let query = supabase
    .from('payment_summary')
    .select('*')
    .eq('arbiter_id', arbiterId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query;
  return { data: (data as Payment[] | null) ?? [], error, hasMore: (data?.length ?? 0) === PAGE_SIZE };
}

export async function fetchPaymentStats(arbiterId: string) {
  return supabase.from('payments').select('amount, payment_status, created_at').eq('arbiter_id', arbiterId);
}

export async function fetchPaymentDues(arbiterId: string) {
  return supabase
    .from('payment_due')
    .select('id, payment_type, amount, due_date')
    .eq('arbiter_id', arbiterId)
    .eq('is_paid', false)
    .order('due_date', { ascending: true });
}

export async function fetchPaymentById(paymentId: string, arbiterId: string) {
  return supabase
    .from('payment_summary')
    .select('*')
    .eq('id', paymentId)
    .eq('arbiter_id', arbiterId)
    .single<Payment>();
}

export type NewPaymentType = 'annual_dues' | 'checkoff' | 'penalty' | 'donation' | 'certification';

export const NEW_PAYMENT_TYPES: { id: NewPaymentType; label: string; description: string }[] = [
  { id: 'annual_dues', label: 'Annual Dues', description: 'Yearly membership fee' },
  { id: 'checkoff', label: 'Checkoff', description: 'Checkoff fee' },
  { id: 'penalty', label: 'Penalty', description: 'Outstanding penalties' },
  { id: 'donation', label: 'Donation', description: 'Support the federation' },
  { id: 'certification', label: 'Certification', description: 'Certification fees' },
];

// Same insert shape as the web app's PaymentDialog. For annual_dues/checkoff/
// penalty the DB overrides this amount with the real amount owed from
// payment_due regardless of what's sent -- this value only sticks as-is for
// donation/certification, which have no underlying due row to check against.
export async function createPayment(params: {
  arbiterId: string;
  paymentType: NewPaymentType;
  amount: number;
  description: string | null;
  paymentMethod?: 'bank_transfer';
  receiptUrl?: string;
}) {
  return supabase
    .from('payments')
    .insert({
      arbiter_id: params.arbiterId,
      amount: params.amount,
      payment_type: params.paymentType,
      payment_status: 'pending',
      payment_method: params.paymentMethod,
      receipt_url: params.receiptUrl,
      description: params.description,
    })
    .select()
    .single();
}
