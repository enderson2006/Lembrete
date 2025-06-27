/*
  # Add user assignment support to reminders

  1. Schema Changes
    - Rename `user_id` to `owner_id` in reminders table
    - Add `assigned_to_user_id` column to reminders table
    - Create `profiles` table for user information

  2. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `display_name` (text, optional)
      - `created_at` (timestamp)

  3. Security Updates
    - Update RLS policies for reminders to support assignment
    - Add RLS policies for profiles table
    - Allow users to view reminders they own OR are assigned to
    - Allow users to view all profiles for assignment purposes

  4. Indexes
    - Add indexes for better performance on new columns
*/

-- First, create the profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  display_name text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add the assigned_to_user_id column to reminders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminders' AND column_name = 'assigned_to_user_id'
  ) THEN
    ALTER TABLE reminders ADD COLUMN assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Rename user_id to owner_id (if not already renamed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminders' AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminders' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE reminders RENAME COLUMN user_id TO owner_id;
  END IF;
END $$;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete own reminders" ON reminders;

-- Updated RLS policies for reminders
CREATE POLICY "Users can view own or assigned reminders"
  ON reminders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = assigned_to_user_id);

CREATE POLICY "Users can insert own reminders"
  ON reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own or assigned reminders"
  ON reminders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = assigned_to_user_id)
  WITH CHECK (auth.uid() = owner_id OR auth.uid() = assigned_to_user_id);

CREATE POLICY "Users can delete own reminders"
  ON reminders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reminders_owner_id ON reminders(owner_id);
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to_user_id ON reminders(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();