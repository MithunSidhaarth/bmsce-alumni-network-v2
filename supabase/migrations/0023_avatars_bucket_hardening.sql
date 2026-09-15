-- ============================================================================
-- BMS Alumni Network — close a file-upload gap found in a security audit:
-- the public `avatars` bucket had no allowed_mime_types and no
-- file_size_limit at all. Any authenticated user could upload an arbitrarily
-- large file of ANY type (HTML, SVG with an embedded <script>, an
-- executable, ...) to a folder under their own uid, and it would be served
-- back publicly from a trusted project domain with a browser-inferred
-- Content-Type — a hosting/phishing vector and a storage-cost DoS, even
-- though it can't execute in the app's own origin.
--
-- Every other bucket (gallery-photos, newsletters, resumes) already had
-- both restrictions from the migration that created it; avatars was the
-- one gap. Migration 0023 (run after 0022).
-- ============================================================================

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 5242880 -- 5 MB, matches the resumes bucket cap
where id = 'avatars';
