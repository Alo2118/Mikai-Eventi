-- Remove [S] prefix from kit_contents piece names
UPDATE kit_contents
SET piece_name = LTRIM(SUBSTRING(piece_name FROM 5))
WHERE piece_name LIKE '[S] %';
