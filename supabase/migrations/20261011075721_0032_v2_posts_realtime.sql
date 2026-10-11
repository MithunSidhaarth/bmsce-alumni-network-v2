-- New posts are announced live in the feed ("someone just posted").
-- Realtime applies Row Level Security, so a member only ever receives rows
-- they are allowed to read.
alter publication supabase_realtime add table public.posts;
