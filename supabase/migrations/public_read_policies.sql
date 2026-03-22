-- Allow anonymous/public users to read forums, threads, and forum_posts
-- Run this in Supabase SQL Editor

-- Forums
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'forums' AND policyname = 'Public can read forums'
  ) THEN
    CREATE POLICY "Public can read forums"
      ON forums FOR SELECT
      USING (true);
  END IF;
END $$;

-- Threads
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'threads' AND policyname = 'Public can read threads'
  ) THEN
    CREATE POLICY "Public can read threads"
      ON threads FOR SELECT
      USING (true);
  END IF;
END $$;

-- Forum posts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'forum_posts' AND policyname = 'Public can read forum_posts'
  ) THEN
    CREATE POLICY "Public can read forum_posts"
      ON forum_posts FOR SELECT
      USING (true);
  END IF;
END $$;
