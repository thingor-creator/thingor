-- Migration: 20261018_fix_all_household_module_sharing.sql
-- Description: Complete household sharing policies for Collections, Notes, Contacts, Pantry, Storage, Documents, Loans, Repairs & Financings

-- 1. Collections: Allow household members to view shared collections
ALTER POLICY "collections_select_policy" ON "public"."collections"
USING (
  (user_id = auth.uid()) 
  OR (is_public = true) 
  OR is_admin()
  OR (EXISTS (
    SELECT 1 FROM household_members hm_owner
    JOIN household_members hm_viewer ON hm_viewer.household_id = hm_owner.household_id
    WHERE hm_owner.user_id = collections.user_id
      AND hm_viewer.user_id = auth.uid()
      AND (COALESCE(hm_viewer.sharing_mode, 'all') = 'all' OR (hm_viewer.allowed_modules->>'collections')::boolean IS NOT FALSE)
  ))
);

-- 2. Collections: Allow household editors/admins to update shared collections
ALTER POLICY "collections_update_policy" ON "public"."collections"
USING (
  (user_id = auth.uid()) 
  OR is_admin() 
  OR EXISTS (
    SELECT 1 FROM household_members hm_owner
    JOIN household_members hm_editor ON hm_editor.household_id = hm_owner.household_id
    WHERE hm_owner.user_id = collections.user_id
      AND hm_editor.user_id = auth.uid()
      AND hm_editor.role IN ('owner', 'admin', 'editor')
      AND (COALESCE(hm_editor.sharing_mode, 'all') = 'all' OR (hm_editor.allowed_modules->>'collections')::boolean IS NOT FALSE)
  )
)
WITH CHECK (
  (user_id = auth.uid()) 
  OR is_admin() 
  OR EXISTS (
    SELECT 1 FROM household_members hm_owner
    JOIN household_members hm_editor ON hm_editor.household_id = hm_owner.household_id
    WHERE hm_owner.user_id = collections.user_id
      AND hm_editor.user_id = auth.uid()
      AND hm_editor.role IN ('owner', 'admin', 'editor')
      AND (COALESCE(hm_editor.sharing_mode, 'all') = 'all' OR (hm_editor.allowed_modules->>'collections')::boolean IS NOT FALSE)
  )
);

-- 3. Collection Items: Allow household members to view items in shared collections
ALTER POLICY "collection_items_select_policy" ON "public"."collection_items"
USING (
  EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_items.collection_id
      AND (
        c.user_id = auth.uid()
        OR c.is_public = true
        OR is_admin()
        OR EXISTS (
          SELECT 1 FROM household_members hm_owner
          JOIN household_members hm_viewer ON hm_viewer.household_id = hm_owner.household_id
          WHERE hm_owner.user_id = c.user_id
            AND hm_viewer.user_id = auth.uid()
            AND (COALESCE(hm_viewer.sharing_mode, 'all') = 'all' OR (hm_viewer.allowed_modules->>'collections')::boolean IS NOT FALSE)
        )
      )
  )
);

-- 4. Collection Items: Allow household members to add items to shared collections
ALTER POLICY "collection_items_insert_policy" ON "public"."collection_items"
WITH CHECK (
  EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_items.collection_id
      AND (
        c.user_id = auth.uid()
        OR is_admin()
        OR EXISTS (
          SELECT 1 FROM household_members hm_owner
          JOIN household_members hm_viewer ON hm_viewer.household_id = hm_owner.household_id
          WHERE hm_owner.user_id = c.user_id
            AND hm_viewer.user_id = auth.uid()
            AND (COALESCE(hm_viewer.sharing_mode, 'all') = 'all' OR (hm_viewer.allowed_modules->>'collections')::boolean IS NOT FALSE)
        )
      )
  )
);

-- 5. Collection Items: Allow household members to update items in shared collections
ALTER POLICY "collection_items_update_policy" ON "public"."collection_items"
USING (
  EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_items.collection_id
      AND (
        c.user_id = auth.uid()
        OR is_admin()
        OR EXISTS (
          SELECT 1 FROM household_members hm_owner
          JOIN household_members hm_viewer ON hm_viewer.household_id = hm_owner.household_id
          WHERE hm_owner.user_id = c.user_id
            AND hm_viewer.user_id = auth.uid()
            AND (COALESCE(hm_viewer.sharing_mode, 'all') = 'all' OR (hm_viewer.allowed_modules->>'collections')::boolean IS NOT FALSE)
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_items.collection_id
      AND (
        c.user_id = auth.uid()
        OR is_admin()
        OR EXISTS (
          SELECT 1 FROM household_members hm_owner
          JOIN household_members hm_viewer ON hm_viewer.household_id = hm_owner.household_id
          WHERE hm_owner.user_id = c.user_id
            AND hm_viewer.user_id = auth.uid()
            AND (COALESCE(hm_viewer.sharing_mode, 'all') = 'all' OR (hm_viewer.allowed_modules->>'collections')::boolean IS NOT FALSE)
        )
      )
  )
);

-- 6. Quick Notes: Allow household members to view shared quick notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quick_notes' AND policyname = 'quick_notes_household_select_policy'
  ) THEN
    CREATE POLICY "quick_notes_household_select_policy" ON "public"."quick_notes"
    FOR SELECT TO "authenticated"
    USING (
      (auth.uid() = user_id)
      OR EXISTS (
        SELECT 1 FROM household_members hm_owner
        JOIN household_members hm_viewer ON hm_viewer.household_id = hm_owner.household_id
        WHERE hm_owner.user_id = quick_notes.user_id
          AND hm_viewer.user_id = auth.uid()
          AND (COALESCE(hm_viewer.sharing_mode, 'all') = 'all' OR (hm_viewer.allowed_modules->>'notes')::boolean IS NOT FALSE)
      )
    );
  END IF;
END $$;

-- 7. Lending Contacts: Allow household members to view shared contacts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lending_contacts' AND policyname = 'lending_contacts_household_select_policy'
  ) THEN
    CREATE POLICY "lending_contacts_household_select_policy" ON "public"."lending_contacts"
    FOR SELECT TO "authenticated"
    USING (
      (auth.uid() = user_id)
      OR EXISTS (
        SELECT 1 FROM household_members hm_owner
        JOIN household_members hm_viewer ON hm_viewer.household_id = hm_owner.household_id
        WHERE hm_owner.user_id = lending_contacts.user_id
          AND hm_viewer.user_id = auth.uid()
          AND (COALESCE(hm_viewer.sharing_mode, 'all') = 'all' OR (hm_viewer.allowed_modules->>'lending')::boolean IS NOT FALSE)
      )
    );
  END IF;
END $$;

-- 8. Pantry Items: Allow household members to view shared pantry items
ALTER POLICY "pantry_items_select_policy" ON "public"."pantry_items"
USING (
  (user_id = auth.uid()) 
  OR is_admin() 
  OR (
    household_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = pantry_items.household_id
        AND (hm.user_id = auth.uid() OR (hm.user_id IS NULL AND lower(hm.user_email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))))
        AND (COALESCE(hm.sharing_mode, 'all') = 'all' OR (hm.allowed_modules->>'pantry')::boolean IS NOT FALSE)
    )
  )
  OR EXISTS (
    SELECT 1 FROM household_members hm_owner
    JOIN household_members hm_viewer ON hm_viewer.household_id = hm_owner.household_id
    WHERE hm_owner.user_id = pantry_items.user_id
      AND hm_viewer.user_id = auth.uid()
      AND (COALESCE(hm_viewer.sharing_mode, 'all') = 'all' OR (hm_viewer.allowed_modules->>'pantry')::boolean IS NOT FALSE)
  )
);

-- 9. Storage Containers: Support storage module and full sharing
ALTER POLICY "storage_containers_select_policy" ON "public"."storage_containers"
USING (
  (user_id = auth.uid()) 
  OR (
    (ownership_scope = 'household') 
    AND (household_id IS NOT NULL) 
    AND is_household_member(household_id) 
    AND (EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = storage_containers.household_id
        AND (hm.user_id = auth.uid() OR (lower(hm.user_email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))))
        AND (
          COALESCE(hm.sharing_mode, 'all') = 'all'
          OR (hm.allowed_modules->>'storage')::boolean IS NOT FALSE
          OR (hm.allowed_modules->>'inventory')::boolean IS NOT FALSE
        )
        AND (
          storage_containers.location_id IS NULL
          OR COALESCE(hm.sharing_mode, 'all') = 'all'
          OR (storage_containers.location_id::text = ANY (COALESCE(hm.allowed_location_ids, ARRAY[]::text[])))
          OR EXISTS (
            SELECT 1 FROM locations loc
            WHERE loc.id = storage_containers.location_id
              AND can_access_shared_location(loc.id, loc.user_id, loc.household_id, loc.parent_id)
          )
        )
    ))
  )
);

-- 10. Container Items: Support storage module and full sharing
ALTER POLICY "container_items_select_policy" ON "public"."container_items"
USING (
  (user_id = auth.uid()) 
  OR (
    (ownership_scope = 'household') 
    AND (household_id IS NOT NULL) 
    AND is_household_member(household_id) 
    AND (EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = container_items.household_id
        AND (hm.user_id = auth.uid() OR (lower(hm.user_email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))))
        AND (
          COALESCE(hm.sharing_mode, 'all') = 'all'
          OR (hm.allowed_modules->>'storage')::boolean IS NOT FALSE
          OR (hm.allowed_modules->>'inventory')::boolean IS NOT FALSE
        )
        AND EXISTS (
          SELECT 1 FROM storage_containers sc
          WHERE sc.id = container_items.container_id
            AND (
              sc.location_id IS NULL
              OR COALESCE(hm.sharing_mode, 'all') = 'all'
              OR (sc.location_id::text = ANY (COALESCE(hm.allowed_location_ids, ARRAY[]::text[])))
              OR EXISTS (
                SELECT 1 FROM locations loc
                WHERE loc.id = sc.location_id
                  AND can_access_shared_location(loc.id, loc.user_id, loc.household_id, loc.parent_id)
              )
            )
        )
    ))
  )
);

-- 11. Item Documents: Support documents module and full sharing
ALTER POLICY "item_documents_select_policy" ON "public"."item_documents"
USING (
  is_admin() 
  OR (user_id = auth.uid()) 
  OR (
    (is_vault_protected IS NOT TRUE) 
    AND (EXISTS (
      SELECT 1 FROM items
      WHERE items.id = item_documents.item_id
        AND items.is_vault_protected IS NOT TRUE
        AND items.household_id IS NOT NULL
        AND can_access_shared_item(items.id, items.household_id, items.user_id, items.location_id, items.category_id)
        AND (EXISTS (
          SELECT 1 FROM household_members hm
          WHERE hm.household_id = items.household_id
            AND (hm.user_id = auth.uid() OR (hm.user_id IS NULL AND lower(hm.user_email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))))
            AND (COALESCE(hm.sharing_mode, 'all') = 'all' OR (hm.allowed_modules->>'documents')::boolean IS NOT FALSE)
        ))
    ))
  )
);

-- 12. Item Repairs, Financings, Loans: Support owner fallback
ALTER POLICY "item_repairs_household_select_policy" ON "public"."item_repairs"
USING (
  (auth.uid() = user_id) 
  OR EXISTS (
    SELECT 1 FROM items i
    JOIN household_members hm_owner ON (hm_owner.household_id = i.household_id OR hm_owner.user_id = i.user_id)
    JOIN household_members hm_viewer ON hm_viewer.household_id = hm_owner.household_id
    WHERE i.id = item_repairs.item_id
      AND hm_viewer.user_id = auth.uid()
      AND (COALESCE(hm_viewer.sharing_mode, 'all') = 'all' OR (hm_viewer.allowed_modules->>'repairs')::boolean IS NOT FALSE)
  )
);

ALTER POLICY "item_financings_household_select_policy" ON "public"."item_financings"
USING (
  (auth.uid() = user_id) 
  OR EXISTS (
    SELECT 1 FROM items i
    JOIN household_members hm_owner ON (hm_owner.household_id = i.household_id OR hm_owner.user_id = i.user_id)
    JOIN household_members hm_viewer ON hm_viewer.household_id = hm_owner.household_id
    WHERE i.id = item_financings.item_id
      AND hm_viewer.user_id = auth.uid()
      AND (COALESCE(hm_viewer.sharing_mode, 'all') = 'all' OR (hm_viewer.allowed_modules->>'financing')::boolean IS NOT FALSE)
  )
);

ALTER POLICY "item_loans_select_policy" ON "public"."item_loans"
USING (
  (auth.uid() = user_id) 
  OR is_admin() 
  OR EXISTS (
    SELECT 1 FROM items i
    JOIN household_members hm_owner ON (hm_owner.household_id = i.household_id OR hm_owner.user_id = i.user_id)
    JOIN household_members hm_viewer ON hm_viewer.household_id = hm_owner.household_id
    WHERE (i.id = item_loans.item_id OR item_loans.user_id = hm_owner.user_id)
      AND hm_viewer.user_id = auth.uid()
      AND (COALESCE(hm_viewer.sharing_mode, 'all') = 'all' OR (hm_viewer.allowed_modules->>'lending')::boolean IS NOT FALSE)
  )
);
