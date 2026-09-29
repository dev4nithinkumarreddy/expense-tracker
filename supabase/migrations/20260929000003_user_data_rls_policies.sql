-- policies for expenses
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- policies for bills
DROP POLICY IF EXISTS "bills_select" ON public.bills;
CREATE POLICY "bills_select" ON public.bills FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "bills_insert" ON public.bills;
CREATE POLICY "bills_insert" ON public.bills FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "bills_update" ON public.bills;
CREATE POLICY "bills_update" ON public.bills FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "bills_delete" ON public.bills;
CREATE POLICY "bills_delete" ON public.bills FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- policies for budgets
DROP POLICY IF EXISTS "budgets_select" ON public.budgets;
CREATE POLICY "budgets_select" ON public.budgets FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "budgets_insert" ON public.budgets;
CREATE POLICY "budgets_insert" ON public.budgets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "budgets_update" ON public.budgets;
CREATE POLICY "budgets_update" ON public.budgets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "budgets_delete" ON public.budgets;
CREATE POLICY "budgets_delete" ON public.budgets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- policies for debts
DROP POLICY IF EXISTS "debts_select" ON public.debts;
CREATE POLICY "debts_select" ON public.debts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "debts_insert" ON public.debts;
CREATE POLICY "debts_insert" ON public.debts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "debts_update" ON public.debts;
CREATE POLICY "debts_update" ON public.debts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "debts_delete" ON public.debts;
CREATE POLICY "debts_delete" ON public.debts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- policies for subscriptions
DROP POLICY IF EXISTS "subscriptions_select" ON public.subscriptions;
CREATE POLICY "subscriptions_select" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "subscriptions_insert" ON public.subscriptions;
CREATE POLICY "subscriptions_insert" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "subscriptions_update" ON public.subscriptions;
CREATE POLICY "subscriptions_update" ON public.subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "subscriptions_delete" ON public.subscriptions;
CREATE POLICY "subscriptions_delete" ON public.subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- policies for wishlist
DROP POLICY IF EXISTS "wishlist_select" ON public.wishlist;
CREATE POLICY "wishlist_select" ON public.wishlist FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wishlist_insert" ON public.wishlist;
CREATE POLICY "wishlist_insert" ON public.wishlist FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "wishlist_update" ON public.wishlist;
CREATE POLICY "wishlist_update" ON public.wishlist FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "wishlist_delete" ON public.wishlist;
CREATE POLICY "wishlist_delete" ON public.wishlist FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- policies for push_subscriptions
DROP POLICY IF EXISTS "push_subscriptions_select" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_subscriptions_insert" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_subscriptions_update" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_update" ON public.push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_subscriptions_delete" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);
