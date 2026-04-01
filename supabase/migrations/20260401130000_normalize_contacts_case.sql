-- Normalize existing contacts: capitalize names, lowercase emails, trim whitespace

-- Temporarily disable audit trigger (migration runs without auth context)
ALTER TABLE contacts DISABLE TRIGGER USER;

-- Capitalize each word: "omar el ezzo" → "Omar El Ezzo"
CREATE OR REPLACE FUNCTION pg_temp.capitalize_words(input text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT string_agg(upper(left(word, 1)) || lower(substring(word from 2)), ' ')
  FROM unnest(string_to_array(trim(input), ' ')) AS word
  WHERE word != ''
$$;

UPDATE contacts SET
  nome = pg_temp.capitalize_words(nome),
  cognome = pg_temp.capitalize_words(cognome),
  citta = CASE WHEN citta IS NOT NULL AND citta != '' THEN pg_temp.capitalize_words(citta) ELSE citta END,
  email = CASE WHEN email IS NOT NULL THEN lower(trim(email)) ELSE email END,
  telefono = CASE WHEN telefono IS NOT NULL THEN trim(telefono) ELSE telefono END,
  azienda = CASE WHEN azienda IS NOT NULL THEN trim(azienda) ELSE azienda END
WHERE
  nome IS DISTINCT FROM pg_temp.capitalize_words(nome)
  OR cognome IS DISTINCT FROM pg_temp.capitalize_words(cognome)
  OR (citta IS NOT NULL AND citta != '' AND citta IS DISTINCT FROM pg_temp.capitalize_words(citta))
  OR (email IS NOT NULL AND email IS DISTINCT FROM lower(trim(email)))
  OR (telefono IS NOT NULL AND telefono IS DISTINCT FROM trim(telefono))
  OR (azienda IS NOT NULL AND azienda IS DISTINCT FROM trim(azienda));

-- Re-enable triggers
ALTER TABLE contacts ENABLE TRIGGER USER;
