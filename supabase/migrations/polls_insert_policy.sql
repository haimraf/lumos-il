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
