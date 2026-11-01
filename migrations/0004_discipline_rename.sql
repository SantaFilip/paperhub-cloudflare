-- Disciplines changed (Filip 2026-11-01): "Economics" is now "Business & Economics", and "History & Humanities"
-- is split into "History" and "Humanities". Existing records in the joint category were humanities papers
-- (the one at the time was about scientific methodology), so they move to "Humanities".
UPDATE presentations SET discipline = 'Business & Economics' WHERE discipline = 'Economics';
UPDATE presentations SET discipline = 'Humanities' WHERE discipline = 'History & Humanities';
