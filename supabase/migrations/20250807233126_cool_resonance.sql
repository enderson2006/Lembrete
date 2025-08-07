/*
  # Fix RLS policies for profiles table

  1. Security Updates
    - Add policy to allow anon users to view their own profile
    - This fixes the 401 error when fetching profiles for unconfirmed users
    - Maintains security while allowing proper profile access

  2. Changes
    - Add "Anon users can view own profile" policy
    - This allows users to access their profile even before email confirmation
*/

-- Add policy for anon users to view their own profile
CREATE POLICY "Anon users can view own profile"
  ON profiles
  FOR SELECT
  TO anon
  USING (auth.uid() = id);