-- ============================================================
-- AI Meeting Assistant — 数据库建表 + RLS
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- meetings
create table public.meetings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  title        text not null default '',
  tag          text not null default '未分类',
  meeting_date date not null default current_date,
  content      text not null default '',
  summary      text,
  structured   jsonb default '{"progress":[],"conclusions":[],"time_nodes":[]}'::jsonb,
  created_at   timestamptz not null default now()
);
alter table public.meetings enable row level security;
create policy "own meetings" on public.meetings for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- todos
create table public.todos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  meeting_id    uuid references public.meetings(id) on delete cascade,
  tag           text not null default '未分类',
  task          text not null,
  owner         text,
  status        text not null default 'open'
                  check (status in ('open','done')),
  deadline_text text,
  deadline_date date,
  risk_level    text not null default 'medium'
                  check (risk_level in ('low','medium','high')),
  created_at    timestamptz not null default now()
);
alter table public.todos enable row level security;
create policy "own todos" on public.todos for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- risks
create table public.risks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  meeting_id uuid references public.meetings(id) on delete cascade,
  tag        text not null default '未分类',
  content    text not null,
  level      text not null default 'medium'
               check (level in ('low','medium','high')),
  created_at timestamptz not null default now()
);
alter table public.risks enable row level security;
create policy "own risks" on public.risks for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- reports
create table public.reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  tag        text not null default '未分类',
  title      text not null default '',
  content    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "own reports" on public.reports for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
