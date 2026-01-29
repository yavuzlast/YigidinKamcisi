import { GroupMember, ExpenseOccurrence, MemberBalance, Settlement } from '@/types/database';

interface OccurrenceWithDetails extends ExpenseOccurrence {
  payer_user_id: string;
  participant_user_ids: string[];
}

/**
 * Belirli bir ay için kişi başı bakiyeleri hesaplar
 */
export function calculateBalances(
  members: GroupMember[],
  occurrences: OccurrenceWithDetails[]
): MemberBalance[] {
  const balanceMap = new Map<string, { paid: number; owed: number }>();

  // Başlangıç değerleri
  members.forEach((member) => {
    balanceMap.set(member.user_id, { paid: 0, owed: 0 });
  });

  // Her occurrence için hesapla
  occurrences.forEach((occ) => {
    const participantCount = occ.participant_user_ids.length;
    if (participantCount === 0) return;

    const sharePerPerson = occ.amount / participantCount;

    // Ödeyenin paid değerini artır
    const payerBalance = balanceMap.get(occ.payer_user_id);
    if (payerBalance) {
      payerBalance.paid += occ.amount;
    }

    // Katılımcıların owed değerini artır
    occ.participant_user_ids.forEach((userId) => {
      const balance = balanceMap.get(userId);
      if (balance) {
        balance.owed += sharePerPerson;
      }
    });
  });

  // MemberBalance dizisi oluştur
  return members.map((member) => {
    const balance = balanceMap.get(member.user_id) || { paid: 0, owed: 0 };
    return {
      user_id: member.user_id,
      display_name: member.display_name,
      email: member.email,
      total_paid: Math.round(balance.paid * 100) / 100,
      total_owed: Math.round(balance.owed * 100) / 100,
      net_balance: Math.round((balance.paid - balance.owed) * 100) / 100,
    };
  });
}

/**
 * Bakiyelerden minimum transfer sayısıyla ödeme önerileri üretir
 * Greedy algoritma: en büyük borçlu → en büyük alacaklıya öder
 */
export function calculateSettlements(balances: MemberBalance[]): Settlement[] {
  const settlements: Settlement[] = [];

  // Kopyala ve sırala
  const debtors = balances
    .filter((b) => b.net_balance < -0.01)
    .map((b) => ({ ...b, remaining: Math.abs(b.net_balance) }))
    .sort((a, b) => b.remaining - a.remaining);

  const creditors = balances
    .filter((b) => b.net_balance > 0.01)
    .map((b) => ({ ...b, remaining: b.net_balance }))
    .sort((a, b) => b.remaining - a.remaining);

  let debtorIdx = 0;
  let creditorIdx = 0;

  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    const amount = Math.min(debtor.remaining, creditor.remaining);

    if (amount > 0.01) {
      settlements.push({
        from_user_id: debtor.user_id,
        from_name: debtor.display_name,
        to_user_id: creditor.user_id,
        to_name: creditor.display_name,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtor.remaining -= amount;
    creditor.remaining -= amount;

    if (debtor.remaining < 0.01) debtorIdx++;
    if (creditor.remaining < 0.01) creditorIdx++;
  }

  return settlements;
}

/**
 * Ay string'ini (YYYY-MM) Date'e çevirir (ayın ilk günü)
 */
export function monthStringToDate(monthStr: string): Date {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

/**
 * Date'i ay string'ine (YYYY-MM) çevirir
 */
export function dateToMonthString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Türkçe ay adı
 */
export function getMonthName(monthStr: string): string {
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  const [year, month] = monthStr.split('-').map(Number);
  return `${months[month - 1]} ${year}`;
}

/**
 * Para formatı (TL)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
}

