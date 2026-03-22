CREATE POLICY "Admins can insert polls"
  ON polls FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can insert poll_options"
  ON poll_options FOR INSERT
  WITH CHECK (true);
