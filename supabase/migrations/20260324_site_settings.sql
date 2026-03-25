-- Create site_settings table for dynamic configurations
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins/mods to manage settings
CREATE POLICY "Admins and mods can manage site settings" 
ON public.site_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('מנהל', 'מנחה')
  )
);

-- Allow everyone to read site settings
CREATE POLICY "Everyone can read site settings" 
ON public.site_settings 
FOR SELECT 
TO public 
USING (true);

-- Initial Passover event settings
INSERT INTO public.site_settings (key, value)
VALUES (
    'passover_event',
    '{
        "active": true,
        "start_date": "2026-04-01T18:30:00Z",
        "end_date": "2026-04-15T23:59:59Z",
        "title": "פסח בטירה",
        "year": 2026
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
