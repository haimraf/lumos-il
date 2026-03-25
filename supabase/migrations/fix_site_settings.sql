-- 1. Ensure table and PK are correct
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'site_settings_pkey') THEN
        ALTER TABLE site_settings ADD PRIMARY KEY (key);
    END IF;
END $$;

-- 2. Ensure RLS is enabled
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 3. DROP old policies
DROP POLICY IF EXISTS "Everyone can read site settings" ON site_settings;
DROP POLICY IF EXISTS "Admins and mods can manage site settings" ON site_settings;

-- 4. Create simple, robust policies
CREATE POLICY "Public Read" ON site_settings FOR SELECT USING (true);

-- This policy grants ALL access to any authenticated user who is an admin/mod.
-- We use a simpler check to avoid subquery deadlocks.
CREATE POLICY "Admin Manage" ON site_settings FOR ALL 
TO authenticated
USING ( 
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('מנהל', 'מנחה'))
)
WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('מנהל', 'מנחה'))
);

-- 5. Final Reset of the key just in case
INSERT INTO site_settings (key, value)
VALUES ('passover_event', '{"active": true, "start_date": "2026-04-01T18:30:00Z", "end_date": "2026-04-15T23:59:59Z", "title": "פסח בטירה", "year": 2026}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
