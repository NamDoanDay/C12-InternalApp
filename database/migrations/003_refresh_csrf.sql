ALTER TABLE refresh_tokens
  ADD COLUMN csrf_hash CHAR(64) NULL AFTER token_hash;
