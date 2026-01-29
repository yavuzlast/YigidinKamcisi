'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/balances';

interface ExpenseItemProps {
  expense: {
    id: string;
    title: string;
    total_amount: number;
    expense_date: string;
    is_installment: boolean;
    installment_months: number;
    payer?: { display_name: string } | null;
  };
}

export default function ExpenseItem({ expense }: ExpenseItemProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setDeleting(true);
    const supabase = createClient();

    try {
      await supabase.from('expense_occurrences').delete().eq('expense_id', expense.id);
      await supabase.from('expense_participants').delete().eq('expense_id', expense.id);
      await supabase.from('expenses').delete().eq('id', expense.id);
      
      router.refresh();
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Silme işlemi başarısız');
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors group">
      <Link
        href={`/expenses/${expense.id}`}
        className="flex items-center gap-3 flex-1"
      >
        <div className="w-10 h-10 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center">
          {expense.is_installment ? (
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          )}
        </div>
        <div>
          <div className="font-medium group-hover:text-orange-400 transition-colors">
            {expense.title}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">
            {expense.payer?.display_name || 'Bilinmiyor'} ödedi · {new Date(expense.expense_date).toLocaleDateString('tr-TR')}
            {expense.is_installment && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs">
                {expense.installment_months} taksit
              </span>
            )}
          </div>
        </div>
      </Link>
      
      <div className="flex items-center gap-3">
        <div className="font-semibold">{formatCurrency(expense.total_amount)}</div>
        
        {showConfirm ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 rounded-lg bg-red-500 text-white text-xs hover:bg-red-600 transition-colors"
            >
              {deleting ? '...' : 'Evet'}
            </button>
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg bg-[var(--color-bg-hover)] text-xs hover:bg-[var(--color-border)] transition-colors"
            >
              İptal
            </button>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-all"
            title="Sil"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

