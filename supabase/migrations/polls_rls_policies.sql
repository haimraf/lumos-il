-- Run in Supabase SQL Editor to check and fix polls/poll_options RLS
-- Step 1: Check existing policies
SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE tablename IN ('polls', 'poll_options');

-- Step 2: Replace INSERT policy for polls with an authenticated staff-only check
DROP POLICY IF EXISTS "Admins can insert polls" ON polls;
CREATE POLICY "Admins can insert polls"
  ON polls FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('מנהל', 'מנחה')
    )
  );

-- Step 3: Replace INSERT policy for poll_options with an authenticated staff-only check
DROP POLICY IF EXISTS "Admins can insert poll_options" ON poll_options;
CREATE POLICY "Admins can insert poll_options"
  ON poll_options FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('מנהל', 'מנחה')
    )
  );

-- Step 4: Public SELECT on polls/poll_options (for readers)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'polls' AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Public can read polls"
      ON polls FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'poll_options' AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Public can read poll_options"
      ON poll_options FOR SELECT
      USING (true);
  END IF;
END $$;
