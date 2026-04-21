-- ============================================================
-- WeekFlow — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (one row per auth user)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: own row"
  on public.profiles for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── MIGRATION: rename events → sessions (run if upgrading) ──
-- ALTER TABLE public.events RENAME TO sessions;

-- ── TASKS ────────────────────────────────────────────────────
create table if not exists public.tasks (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text,
  date         date not null,
  time         time,
  end_time     time,
  is_recurring boolean not null default false,
  is_completed boolean not null default false,
  created_at   timestamptz not null default now()
);

-- SESSIONS (lectures + tutorials) ──────────────────────────
create table if not exists public.sessions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  date         date not null,
  start_time   time not null,
  end_time     time not null,
  source       text not null check (source in ('manual', 'task')) default 'manual',
  task_id      uuid references public.tasks(id) on delete cascade,
  color        text default 'blue',
  is_recurring boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── TUTORIALS (linked to sessions) ──────────────────────────
create table if not exists public.tutorials (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_id   uuid references public.sessions(id) on delete cascade,
  title        text not null,
  date         date not null,
  start_time   time not null,
  end_time     time not null,
  color        text default 'orange',
  is_recurring boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── INDEXES
create index if not exists tasks_user_date           on public.tasks(user_id, date);
create index if not exists tasks_user_recurring      on public.tasks(user_id, is_recurring) where is_recurring = true;
create index if not exists sessions_user_date        on public.sessions(user_id, date);
create index if not exists sessions_user_recurring   on public.sessions(user_id, is_recurring) where is_recurring = true;
create index if not exists sessions_task_id          on public.sessions(task_id);
create index if not exists tutorials_user_date       on public.tutorials(user_id, date);
create index if not exists tutorials_user_recurring  on public.tutorials(user_id, is_recurring) where is_recurring = true;
create index if not exists tutorials_session         on public.tutorials(session_id);

-- ── ROW LEVEL SECURITY
alter table public.tasks      enable row level security;
alter table public.sessions   enable row level security;
alter table public.tutorials  enable row level security;

create policy "tasks: own rows"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sessions: own rows"
  on public.sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tutorials: own rows"
  on public.tutorials for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Materials: Study Material Upload + pgvector RAG
-- Run AFTER the main schema above
-- ============================================================

-- Enable pgvector extension
create extension if not exists vector;

-- TUTORIAL_MATERIALS (file metadata per tutorial)
create table if not exists public.tutorial_materials (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  tutorial_id      uuid not null,
  file_name        text not null,
  storage_path     text not null,
  file_size_bytes  bigint,
  mime_type        text not null default 'application/pdf',
  embedding_status text not null default 'pending'
                   check (embedding_status in ('pending', 'processing', 'done', 'error')),
  embedding_error  text,
  created_at       timestamptz not null default now()
);

alter table public.tutorial_materials enable row level security;

create policy "tutorial_materials: own rows"
  on public.tutorial_materials for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists tutorial_materials_tutorial
  on public.tutorial_materials(tutorial_id);

create index if not exists tutorial_materials_user_status
  on public.tutorial_materials(user_id, embedding_status);

-- MATERIAL_CHUNKS (pgvector embeddings per chunk)
create table if not exists public.material_chunks (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  material_id  uuid not null references public.tutorial_materials(id) on delete cascade,
  tutorial_id  uuid not null,
  content      text not null,
  metadata     jsonb default '{}'::jsonb,
  embedding    vector(1536),
  chunk_index  int not null,
  created_at   timestamptz not null default now()
);

alter table public.material_chunks enable row level security;

create policy "material_chunks: own rows"
  on public.material_chunks for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists material_chunks_tutorial
  on public.material_chunks(tutorial_id);

create index if not exists material_chunks_embedding_hnsw
  on public.material_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- ── match_material_chunks: pgvector similarity search (required by RAG summarizer)
-- Run this AFTER the material_chunks table is created above.
create or replace function public.match_material_chunks(
  query_embedding vector(1536),
  match_count     int     default 20,
  filter          jsonb   default '{}'
)
returns table (
  id         uuid,
  content    text,
  metadata   jsonb,
  similarity float
)
language plpgsql
security invoker        -- runs as the caller; service-role key bypasses RLS
as $$
begin
  return query
  select
    mc.id,
    mc.content,
    mc.metadata,
    1 - (mc.embedding <=> query_embedding) as similarity
  from public.material_chunks mc
  where
    case when filter = '{}'::jsonb then true
         else mc.metadata @> filter
    end
  order by mc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ── Supabase Storage RLS (run after creating the 'materials' bucket in dashboard)
-- create policy "materials: upload own folder"
--   on storage.objects for insert to authenticated
--   with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy "materials: read own folder"
--   on storage.objects for select to authenticated
--   using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy "materials: delete own folder"
--   on storage.objects for delete to authenticated
--   using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
