export interface Group {
  id: string;
  name: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface Expense {
  id: string;
  group_id: string;
  created_by: string;
  payer_user_id: string;
  title: string;
  notes: string | null;
  total_amount: number;
  expense_date: string;
  is_installment: boolean;
  installment_months: number;
  installment_start_month: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseParticipant {
  id: string;
  expense_id: string;
  user_id: string;
}

export interface ExpenseOccurrence {
  id: string;
  expense_id: string;
  month: string;
  amount: number;
  created_at: string;
}

// Genişletilmiş tipler (JOIN sonuçları için)
export interface ExpenseWithDetails extends Expense {
  payer?: GroupMember;
  participants?: GroupMember[];
  occurrences?: ExpenseOccurrence[];
}

export interface MemberBalance {
  user_id: string;
  display_name: string;
  email: string;
  total_paid: number;
  total_owed: number;
  net_balance: number; // pozitif = alacaklı, negatif = borçlu
}

export interface Settlement {
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
  amount: number;
}

