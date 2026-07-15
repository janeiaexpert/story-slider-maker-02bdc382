CREATE INDEX IF NOT EXISTS carousels_space_updated_idx ON public.carousels (space_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS carousels_space_id_id_key ON public.carousels (space_id, id);