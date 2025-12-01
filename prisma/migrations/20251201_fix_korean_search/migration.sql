-- Fix: Use unaccent and simple tokenization for Korean
-- Korean requires character-level matching since PostgreSQL doesn't have built-in Korean morphological analyzer

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS tsvectorupdate ON tone_samples;
DROP FUNCTION IF EXISTS tone_samples_text_search_trigger();

-- Recreate with better Korean support (character n-grams)
CREATE OR REPLACE FUNCTION tone_samples_text_search_trigger() RETURNS trigger AS $$
begin
  -- Use simple dictionary + split Korean text into characters for better matching
  new.text_search_vector := to_tsvector('simple', regexp_replace(new.text, '(.)', E'\\1 ', 'g'));
  return new;
end
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE ON tone_samples
FOR EACH ROW EXECUTE FUNCTION tone_samples_text_search_trigger();

-- Update all existing rows
UPDATE tone_samples SET text_search_vector = to_tsvector('simple', regexp_replace(text, '(.)', E'\\1 ', 'g'));
