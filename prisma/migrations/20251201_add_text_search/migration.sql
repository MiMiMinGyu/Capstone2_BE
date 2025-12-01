-- Add tsvector column for full-text search
ALTER TABLE tone_samples ADD COLUMN IF NOT EXISTS text_search_vector tsvector;

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS idx_tone_samples_text_search ON tone_samples USING GIN(text_search_vector);

-- Update existing rows with text search vector
UPDATE tone_samples SET text_search_vector = to_tsvector('simple', text);

-- Create trigger to auto-update text_search_vector
CREATE OR REPLACE FUNCTION tone_samples_text_search_trigger() RETURNS trigger AS $$
begin
  new.text_search_vector := to_tsvector('simple', new.text);
  return new;
end
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tsvectorupdate ON tone_samples;
CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE ON tone_samples
FOR EACH ROW EXECUTE FUNCTION tone_samples_text_search_trigger();
