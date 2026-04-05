CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    reporter_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    handled_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    name text NOT NULL,
    email text NOT NULL,
    topic text NOT NULL DEFAULT 'other',
    subject text NOT NULL,
    message text NOT NULL,
    status text NOT NULL DEFAULT 'new',
    source text NOT NULL DEFAULT 'contact_form',
    path text NULL,
    admin_notes text NULL,
    resolved_at timestamptz NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT contact_submissions_status_check CHECK (status IN ('new', 'in_progress', 'resolved', 'spam'))
);

CREATE INDEX IF NOT EXISTS contact_submissions_status_created_idx
ON public.contact_submissions (status, created_at DESC);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage contact submissions" ON public.contact_submissions;
CREATE POLICY "Admins manage contact submissions"
ON public.contact_submissions
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('מנהל', 'מנחה')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('מנהל', 'מנחה')
    )
);
