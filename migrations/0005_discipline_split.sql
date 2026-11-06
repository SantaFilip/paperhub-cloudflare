-- Disciplines changed (Filip 2026-11-06):
--   "Humanities"           -> "Literature & Cultural Studies"
--   "Social Sciences"      -> "Sociology & Anthropology"
--   "Business & Economics" -> split into "Business & Management" and "Economics"
-- New: Political Science & International Relations, Religious Studies & Theology, Agricultural & Food Sciences,
-- Arts & Design, Communication & Media Studies, Music & Musicology, Education.
-- All "Business & Economics" records at the time came from OpenAlex field 20 (Economics, Econometrics and Finance)
-- (one paper on the social cost of CO2), so they move to "Economics".
UPDATE presentations SET discipline = 'Literature & Cultural Studies' WHERE discipline = 'Humanities';
UPDATE presentations SET discipline = 'Sociology & Anthropology' WHERE discipline = 'Social Sciences';
UPDATE presentations SET discipline = 'Economics' WHERE discipline = 'Business & Economics';
