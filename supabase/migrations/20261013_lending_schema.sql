-- MIGRATION: 20261013_lending_schema.sql
-- Description: Creates item_loans table and policies for the Lending Tracker module.

CREATE TABLE IF NOT EXISTS public.item_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  borrower_name TEXT NOT NULL,
  borrower_contact TEXT,
  borrower_email TEXT,
  lent_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_item_loans_user_id ON public.item_loans(user_id);
CREATE INDEX IF NOT EXISTS idx_item_loans_item_id ON public.item_loans(item_id);
CREATE INDEX IF NOT EXISTS idx_item_loans_status ON public.item_loans(status);
CREATE INDEX IF NOT EXISTS idx_item_loans_expected_return ON public.item_loans(expected_return_date);

-- Enable RLS
ALTER TABLE public.item_loans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "item_loans_select_policy" ON public.item_loans;
CREATE POLICY "item_loans_select_policy"
  ON public.item_loans FOR SELECT
  USING (
    auth.uid() = user_id OR
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_loans.item_id
        AND (
          items.user_id = auth.uid() OR
          items.household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "item_loans_insert_policy" ON public.item_loans;
CREATE POLICY "item_loans_insert_policy"
  ON public.item_loans FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "item_loans_update_policy" ON public.item_loans;
CREATE POLICY "item_loans_update_policy"
  ON public.item_loans FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "item_loans_delete_policy" ON public.item_loans;
CREATE POLICY "item_loans_delete_policy"
  ON public.item_loans FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());
