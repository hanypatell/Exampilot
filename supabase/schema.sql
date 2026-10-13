-- ExamPilot database schema
-- Paste this whole file into Supabase → SQL Editor → Run.

-- ───────────── Tables ─────────────

create table if not exists subjects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  name          text not null,
  exam_date     date not null,
  hours_per_day numeric not null default 2,
  created_at    timestamptz not null default now()
);

create table if not exists topics (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  subject_id      uuid not null references subjects on delete cascade,
  unit            text not null,
  name            text not null,
  position        int  not null default 0,        -- order inside the syllabus
  importance      int  not null default 3 check (importance between 1 and 5),
  mastery         int  not null default 0 check (mastery between 0 and 100),
  weak_count      int  not null default 0,        -- how many doubts were asked on this topic
  last_quiz_score int,                             -- percentage, null = never quizzed
  created_at      timestamptz not null default now()
);

create table if not exists plan_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  subject_id uuid not null references subjects on delete cascade,
  topic_id   uuid references topics on delete cascade,
  day        date not null,
  task_type  text not null check (task_type in ('learn', 'revise', 'practice', 'mock')),
  minutes    int  not null default 45,
  done       boolean not null default false,
  done_at    timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  subject_id uuid not null references subjects on delete cascade,
  name       text not null,
  kind       text not null check (kind in ('syllabus', 'notes')),
  page_count int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists doc_pages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  document_id uuid not null references documents on delete cascade,
  subject_id  uuid not null references subjects on delete cascade,
  page_number int  not null,
  content     text not null,
  fts         tsvector generated always as (to_tsvector('english', content)) stored
);
create index if not exists doc_pages_fts_idx on doc_pages using gin (fts);

create table if not exists doubts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  subject_id    uuid references subjects on delete set null,
  topic_id      uuid references topics on delete set null,
  question_text text not null,
  solution      jsonb not null,
  thumbnail     text,                              -- small JPEG data URL of the photo
  created_at    timestamptz not null default now()
);

create table if not exists quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  topic_id   uuid not null references topics on delete cascade,
  score      int not null,
  total      int not null,
  created_at timestamptz not null default now()
);

-- ───────────── Row Level Security: every user only sees their own rows ─────────────

do $$
declare t text;
begin
  foreach t in array array['subjects','topics','plan_items','documents','doc_pages','doubts','quiz_attempts'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "own rows" on %I', t);
    execute format(
      'create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ───────────── Search function used by "Chat with notes" ─────────────
-- Finds the pages that best match the question (keyword search, ranked).

create or replace function search_pages(p_subject uuid, p_query text, p_limit int default 8)
returns table (document_id uuid, page_number int, content text, rank real)
language sql stable security invoker
as $$
  select dp.document_id, dp.page_number, dp.content, ts_rank(dp.fts, q) as rank
  from doc_pages dp, to_tsquery('english', p_query) q
  where dp.subject_id = p_subject and dp.fts @@ q
  order by rank desc
  limit p_limit;
$$;
