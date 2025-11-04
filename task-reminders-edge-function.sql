-- Task Reminder System using Supabase Edge Functions
-- This approach uses pg_cron to trigger a Supabase Edge Function that sends emails

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Step 2: Create a notifications table to store pending email reminders
CREATE TABLE IF NOT EXISTS task_reminder_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  overdue_count INT DEFAULT 0,
  today_count INT DEFAULT 0,
  week_count INT DEFAULT 0,
  email_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed'))
);

-- Step 3: Create function to queue task reminders
CREATE OR REPLACE FUNCTION queue_task_reminder_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  workspace_record RECORD;
  member_record RECORD;
  task_record RECORD;
  email_body TEXT;
  overdue_tasks TEXT;
  today_tasks TEXT;
  week_tasks TEXT;
  overdue_count INT;
  today_count INT;
  week_count INT;
  today_date DATE;
  week_end_date DATE;
BEGIN
  today_date := CURRENT_DATE;
  week_end_date := CURRENT_DATE + INTERVAL '7 days';

  -- Clear old pending reminders (older than 24 hours)
  DELETE FROM task_reminder_queue
  WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours';

  -- Loop through each workspace
  FOR workspace_record IN
    SELECT DISTINCT workspace_id FROM tasks WHERE target_date IS NOT NULL
  LOOP
    -- Loop through each member of the workspace
    FOR member_record IN
      SELECT DISTINCT wm.user_id, au.email,
             COALESCE(au.raw_user_meta_data->>'display_name', au.email) as display_name
      FROM workspace_members wm
      JOIN auth.users au ON wm.user_id = au.id
      WHERE wm.workspace_id = workspace_record.workspace_id
    LOOP
      -- Initialize counters and sections
      overdue_tasks := '';
      today_tasks := '';
      week_tasks := '';
      overdue_count := 0;
      today_count := 0;
      week_count := 0;

      -- Get overdue tasks
      FOR task_record IN
        SELECT t.heading, t.target_date, t.priority, t.description,
               p.title as project_title,
               c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN contacts c ON t.contact_id = c.id
        WHERE t.workspace_id = workspace_record.workspace_id
          AND t.target_date < today_date
          AND t.status != 'Completed'
        ORDER BY t.priority, t.target_date
      LOOP
        overdue_count := overdue_count + 1;
        overdue_tasks := overdue_tasks || E'\n  • ' || task_record.heading ||
                        ' (Priority ' || task_record.priority || ', Due: ' ||
                        TO_CHAR(task_record.target_date, 'Mon DD') || ')';
        IF task_record.project_title IS NOT NULL THEN
          overdue_tasks := overdue_tasks || E'\n    Project: ' || task_record.project_title;
        END IF;
        IF task_record.contact_name IS NOT NULL AND task_record.contact_name != ' ' THEN
          overdue_tasks := overdue_tasks || E'\n    Contact: ' || task_record.contact_name;
        END IF;
      END LOOP;

      -- Get tasks due today
      FOR task_record IN
        SELECT t.heading, t.target_date, t.priority, t.description,
               p.title as project_title,
               c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN contacts c ON t.contact_id = c.id
        WHERE t.workspace_id = workspace_record.workspace_id
          AND t.target_date = today_date
          AND t.status != 'Completed'
        ORDER BY t.priority
      LOOP
        today_count := today_count + 1;
        today_tasks := today_tasks || E'\n  • ' || task_record.heading ||
                      ' (Priority ' || task_record.priority || ')';
        IF task_record.project_title IS NOT NULL THEN
          today_tasks := today_tasks || E'\n    Project: ' || task_record.project_title;
        END IF;
        IF task_record.contact_name IS NOT NULL AND task_record.contact_name != ' ' THEN
          today_tasks := today_tasks || E'\n    Contact: ' || task_record.contact_name;
        END IF;
      END LOOP;

      -- Get tasks due this week (excluding today)
      FOR task_record IN
        SELECT t.heading, t.target_date, t.priority, t.description,
               p.title as project_title,
               c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN contacts c ON t.contact_id = c.id
        WHERE t.workspace_id = workspace_record.workspace_id
          AND t.target_date > today_date
          AND t.target_date <= week_end_date
          AND t.status != 'Completed'
        ORDER BY t.target_date, t.priority
      LOOP
        week_count := week_count + 1;
        week_tasks := week_tasks || E'\n  • ' || task_record.heading ||
                     ' (Priority ' || task_record.priority || ', Due: ' ||
                     TO_CHAR(task_record.target_date, 'Mon DD') || ')';
        IF task_record.project_title IS NOT NULL THEN
          week_tasks := week_tasks || E'\n    Project: ' || task_record.project_title;
        END IF;
        IF task_record.contact_name IS NOT NULL AND task_record.contact_name != ' ' THEN
          week_tasks := week_tasks || E'\n    Contact: ' || task_record.contact_name;
        END IF;
      END LOOP;

      -- Only queue email if there are any tasks
      IF overdue_count > 0 OR today_count > 0 OR week_count > 0 THEN
        email_body := 'Good morning ' || member_record.display_name || E',\n\n';

        email_body := email_body || 'Here''s your task summary for today (' ||
                     TO_CHAR(today_date, 'Day, Month DD, YYYY') || E'):\n\n';

        -- Add overdue section
        IF overdue_count > 0 THEN
          email_body := email_body || '🔴 OVERDUE TASKS (' || overdue_count || E'):\n' ||
                       overdue_tasks || E'\n\n';
        END IF;

        -- Add today section
        IF today_count > 0 THEN
          email_body := email_body || '🟠 DUE TODAY (' || today_count || E'):\n' ||
                       today_tasks || E'\n\n';
        END IF;

        -- Add this week section
        IF week_count > 0 THEN
          email_body := email_body || '🟡 DUE THIS WEEK (' || week_count || E'):\n' ||
                       week_tasks || E'\n\n';
        END IF;

        email_body := email_body || E'---\n' ||
                     'View all tasks: https://film-crm-coral.vercel.app/tasks' || E'\n\n' ||
                     'This is an automated reminder from your Film CRM.';

        -- Insert into queue
        INSERT INTO task_reminder_queue (
          user_id,
          workspace_id,
          email,
          overdue_count,
          today_count,
          week_count,
          email_content
        ) VALUES (
          member_record.user_id,
          workspace_record.workspace_id,
          member_record.email,
          overdue_count,
          today_count,
          week_count,
          email_body
        );

        RAISE NOTICE 'Queued task reminder for % (% overdue, % today, % this week)',
                    member_record.email, overdue_count, today_count, week_count;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Step 4: Grant permissions
GRANT ALL ON task_reminder_queue TO authenticated;
GRANT ALL ON task_reminder_queue TO service_role;
GRANT EXECUTE ON FUNCTION queue_task_reminder_emails() TO postgres;

-- Step 5: Schedule the cron job to queue reminders daily at 8:00 AM UTC
SELECT cron.schedule(
  'daily-task-reminders-queue',
  '0 8 * * *',
  $$SELECT queue_task_reminder_emails()$$
);

-- Step 6: View pending reminders
-- SELECT * FROM task_reminder_queue WHERE status = 'pending' ORDER BY created_at DESC;

-- Step 7: To manually test, run:
-- SELECT queue_task_reminder_emails();
-- SELECT * FROM task_reminder_queue ORDER BY created_at DESC LIMIT 5;

-- Step 8: To view scheduled cron jobs:
-- SELECT * FROM cron.job;

-- Step 9: To unschedule the job (if needed):
-- SELECT cron.unschedule('daily-task-reminders-queue');

COMMENT ON TABLE task_reminder_queue IS 'Queue for task reminder emails to be sent';
COMMENT ON FUNCTION queue_task_reminder_emails() IS 'Generates and queues daily task reminder emails for all workspace members';
