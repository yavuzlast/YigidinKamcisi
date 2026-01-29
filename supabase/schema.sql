-- Ev Borç Takip Uygulaması - Veritabanı Şeması
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

-- Grup tablosu (tek ev grubu)
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Ev',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grup üyeleri
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Harcamalar
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  payer_user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  notes TEXT,
  total_amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_installment BOOLEAN DEFAULT FALSE,
  installment_months INTEGER DEFAULT 1,
  installment_start_month DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Harcama katılımcıları (bu harcama kimler arasında bölünecek)
CREATE TABLE IF NOT EXISTS expense_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(expense_id, user_id)
);

-- Harcama oluşumları (taksitler için ay ay kayıtlar)
CREATE TABLE IF NOT EXISTS expense_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- Ayın ilk günü (ör: 2026-01-01)
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payer ON expenses(payer_user_id);
CREATE INDEX IF NOT EXISTS idx_expense_occurrences_month ON expense_occurrences(month);
CREATE INDEX IF NOT EXISTS idx_expense_occurrences_expense ON expense_occurrences(expense_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

-- Row Level Security (RLS) Politikaları
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_occurrences ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi grubunu görebilir
CREATE POLICY "Users can view their groups" ON groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

-- Kullanıcı kendi grup üyelerini görebilir
CREATE POLICY "Users can view group members" ON group_members
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

-- Kullanıcı kendi grubundaki harcamaları görebilir
CREATE POLICY "Users can view group expenses" ON expenses
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

-- Kullanıcı kendi grubuna harcama ekleyebilir
CREATE POLICY "Users can insert group expenses" ON expenses
  FOR INSERT WITH CHECK (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

-- Kullanıcı kendi eklediği harcamaları silebilir/güncelleyebilir
CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE USING (created_by = auth.uid());

-- Expense participants politikaları
CREATE POLICY "Users can view expense participants" ON expense_participants
  FOR SELECT USING (
    expense_id IN (
      SELECT id FROM expenses WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert expense participants" ON expense_participants
  FOR INSERT WITH CHECK (
    expense_id IN (
      SELECT id FROM expenses WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete expense participants" ON expense_participants
  FOR DELETE USING (
    expense_id IN (SELECT id FROM expenses WHERE created_by = auth.uid())
  );

-- Expense occurrences politikaları
CREATE POLICY "Users can view expense occurrences" ON expense_occurrences
  FOR SELECT USING (
    expense_id IN (
      SELECT id FROM expenses WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert expense occurrences" ON expense_occurrences
  FOR INSERT WITH CHECK (
    expense_id IN (
      SELECT id FROM expenses WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete expense occurrences" ON expense_occurrences
  FOR DELETE USING (
    expense_id IN (SELECT id FROM expenses WHERE created_by = auth.uid())
  );

-- Başlangıç verisi: Tek ev grubu oluştur
INSERT INTO groups (name) VALUES ('Ev') ON CONFLICT DO NOTHING;

