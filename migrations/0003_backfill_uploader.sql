-- Uploads stored without an uploader although the request was authenticated.
-- The upload page used to send uploader_id/uploader_name itself and sent
-- null/"Anonymous" when its own user fetch had come back empty; the worker
-- still recorded the real account in created_by_id. The worker now stamps
-- these fields itself, so this only repairs the records from before.
UPDATE presentations
SET
  uploader_id = created_by_id,
  uploader_name = COALESCE(
    (SELECT COALESCE(NULLIF(full_name, ''), email) FROM users WHERE users.id = presentations.created_by_id),
    uploader_name
  ),
  uploader_university = COALESCE(
    NULLIF(uploader_university, ''),
    (SELECT university FROM users WHERE users.id = presentations.created_by_id),
    ''
  )
WHERE uploader_id IS NULL AND created_by_id IS NOT NULL;
