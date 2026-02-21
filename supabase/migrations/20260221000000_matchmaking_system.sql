-- Migration: Real Matchmaking System
-- Run this in Supabase SQL Editor after the initial profiles migration

-- 1. Add friend_code to profiles (persistent, unique per user)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friend_code TEXT UNIQUE;

-- Generate codes for any existing profiles
UPDATE public.profiles
SET friend_code = upper(substring(username, 1, 8)) || '-' || upper(substring(md5(user_id::text) from 1 for 6))
WHERE friend_code IS NULL;

-- 2. Update handle_new_user to auto-generate friend_code on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uname TEXT; fcode TEXT;
BEGIN
  uname := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  fcode := upper(substring(uname from 1 for 8)) || '-' || upper(substring(md5(NEW.id::text) from 1 for 6));
  INSERT INTO public.profiles (user_id, username, friend_code) VALUES (NEW.id, uname, fcode);
  RETURN NEW;
END; $$;

-- 3. battle_invites — stores pending/accepted/declined challenges
CREATE TABLE IF NOT EXISTS public.battle_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_username   TEXT NOT NULL,
  from_elo        INTEGER NOT NULL DEFAULT 0,
  to_friend_code  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','declined','cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.battle_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviter manages their invites"
  ON public.battle_invites FOR ALL
  USING (from_user_id = auth.uid());

CREATE POLICY "Invitee can view incoming invites"
  ON public.battle_invites FOR SELECT
  USING (to_friend_code = (SELECT friend_code FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Invitee can respond (update status)"
  ON public.battle_invites FOR UPDATE
  USING (to_friend_code = (SELECT friend_code FROM public.profiles WHERE user_id = auth.uid()));

-- 4. matchmaking_queue — players waiting for an opponent
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username  TEXT NOT NULL,
  elo       INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view queue"
  ON public.matchmaking_queue FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users manage their own queue entry"
  ON public.matchmaking_queue FOR ALL
  USING (user_id = auth.uid());

-- 5. battle_rooms — created when two players are matched
CREATE TABLE IF NOT EXISTS public.battle_rooms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id       UUID NOT NULL REFERENCES auth.users(id),
  player2_id       UUID NOT NULL REFERENCES auth.users(id),
  player1_username TEXT NOT NULL,
  player2_username TEXT NOT NULL,
  player1_elo      INTEGER NOT NULL DEFAULT 0,
  player2_elo      INTEGER NOT NULL DEFAULT 0,
  invite_id        UUID REFERENCES public.battle_invites(id),
  status           TEXT NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.battle_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own battle rooms"
  ON public.battle_rooms FOR SELECT
  USING (player1_id = auth.uid() OR player2_id = auth.uid());

CREATE POLICY "Authenticated users can create battle rooms"
  ON public.battle_rooms FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 6. Enable Supabase Realtime on all 3 new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_invites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_rooms;
