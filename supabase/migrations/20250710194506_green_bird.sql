/*
  # Adicionar suporte para múltiplos usuários em lembretes

  1. Nova Tabela
    - `reminder_assignments`
      - `id` (uuid, primary key)
      - `reminder_id` (uuid, foreign key para reminders)
      - `user_id` (uuid, foreign key para users)
      - `created_at` (timestamp)

  2. Modificações
    - Manter `assigned_to_user_id` na tabela `reminders` para compatibilidade
    - Nova tabela permite múltiplas atribuições por lembrete

  3. Segurança
    - Enable RLS na nova tabela
    - Políticas para usuários visualizarem suas próprias atribuições
    - Políticas para donos gerenciarem atribuições de seus lembretes
*/

-- Criar tabela de atribuições múltiplas
CREATE TABLE IF NOT EXISTS reminder_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reminder_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reminder_assignments_reminder_id ON reminder_assignments(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_assignments_user_id ON reminder_assignments(user_id);

-- Habilitar RLS
ALTER TABLE reminder_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Users can view assignments for their reminders or assigned to them"
  ON reminder_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM reminders 
      WHERE reminders.id = reminder_assignments.reminder_id 
      AND reminders.owner_id = auth.uid()
    )
  );

CREATE POLICY "Reminder owners can insert assignments"
  ON reminder_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reminders 
      WHERE reminders.id = reminder_assignments.reminder_id 
      AND reminders.owner_id = auth.uid()
    )
  );

CREATE POLICY "Reminder owners can delete assignments"
  ON reminder_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reminders 
      WHERE reminders.id = reminder_assignments.reminder_id 
      AND reminders.owner_id = auth.uid()
    )
  );

-- Migrar dados existentes da coluna assigned_to_user_id
INSERT INTO reminder_assignments (reminder_id, user_id)
SELECT id, assigned_to_user_id 
FROM reminders 
WHERE assigned_to_user_id IS NOT NULL
ON CONFLICT (reminder_id, user_id) DO NOTHING;