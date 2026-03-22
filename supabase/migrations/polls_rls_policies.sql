-- Run in Supabase SQL Editor to check and fix polls/poll_options RLS
-- Step 1: Check existing policies
SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE tablename IN ('polls', 'poll_options');

-- Step 2: Add INSERT policy for polls if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'polls' AND cmd = 'INSERT'
  ) THEN
    CREATE POLICY "Admins can insert polls"
      ON polls FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Step 3: Add INSERT policy for poll_options if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'poll_options' AND cmd = 'INSERT'
  ) THEN
    CREATE POLICY "Admins can insert poll_options"
      ON poll_options FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

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
