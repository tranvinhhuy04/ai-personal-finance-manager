-- Tạo bảng Users
create table public."Users" (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email varchar(255) not null unique,
  full_name varchar(150),
  phone varchar(20),
  status smallint not null default 1,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- Tạo bảng UserSettings
create table public."UserSettings" (
  setting_id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public."Users"(user_id) on delete cascade,
  two_factor_enabled boolean not null default false,
  two_factor_method varchar(20),
  two_factor_secret varchar(255),
  preferred_currency varchar(10) not null default 'VND',
  locale varchar(10) not null default 'vi-VN',
  updated_at timestamp not null default now()
);
