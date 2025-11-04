-- Task Reminder Email System with pg_cron
-- This sets up daily email reminders for tasks due today, this week, and overdue tasks

-- Step 1: Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Create function to send task reminder emails
CREATE OR REPLACE FUNCTION send_task_reminder_emails()
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

  -- Loop through each workspace
  FOR workspace_record IN
    SELECT DISTINCT workspace_id FROM tasks WHERE target_date IS NOT NULL
  LOOP
    -- Loop through each member of the workspace
    FOR member_record IN
      SELECT DISTINCT wm.user_id, au.email, au.raw_user_meta_data->>'display_name' as display_name
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
               p.title as project_title, c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
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
        IF task_record.contact_name IS NOT NULL THEN
          overdue_tasks := overdue_tasks || E'\n    Contact: ' || task_record.contact_name;
        END IF;
      END LOOP;

      -- Get tasks due today
      FOR task_record IN
        SELECT t.heading, t.target_date, t.priority, t.description,
               p.title as project_title, c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
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
        IF task_record.contact_name IS NOT NULL THEN
          today_tasks := today_tasks || E'\n    Contact: ' || task_record.contact_name;
        END IF;
      END LOOP;

      -- Get tasks due this week (excluding today)
      FOR task_record IN
        SELECT t.heading, t.target_date, t.priority, t.description,
               p.title as project_title, c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
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
        IF task_record.contact_name IS NOT NULL THEN
          week_tasks := week_tasks || E'\n    Contact: ' || task_record.contact_name;
        END IF;
      END LOOP;

      -- Only send email if there are any tasks
      IF overdue_count > 0 OR today_count > 0 OR week_count > 0 THEN
        email_body := 'Good morning' ||
                     CASE WHEN member_record.display_name IS NOT NULL
                          THEN ' ' || member_record.display_name
                          ELSE '' END || E',\n\n';

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

        -- Send email using Supabase auth.send_email
        PERFORM auth.send_email(
          member_record.email,
          'Task Reminder: ' ||
          CASE
            WHEN overdue_count > 0 THEN overdue_count || ' overdue, '
            ELSE ''
          END ||
          CASE
            WHEN today_count > 0 THEN today_count || ' due today'
            WHEN week_count > 0 THEN week_count || ' due this week'
            ELSE ''
          END,
          email_body
        );

        RAISE NOTICE 'Sent task reminder to % (% overdue, % today, % this week)',
                    member_record.email, overdue_count, today_count, week_count;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Step 3: Schedule the cron job to run daily at 8:00 AM UTC
-- Note: Adjust the time zone if needed. This runs at 8 AM UTC.
-- For 8 AM London time (BST), you'd want 7 AM UTC in summer, 8 AM UTC in winter.
SELECT cron.schedule(
  'daily-task-reminders',
  '0 8 * * *',  -- Run at 8:00 AM UTC every day
  $$SELECT send_task_reminder_emails()$$
);

-- Step 4: Grant necessary permissions
-- This ensures the cron job can access the required tables
GRANT EXECUTE ON FUNCTION send_task_reminder_emails() TO postgres;

-- Step 5: To manually test the function, uncomment and run:
-- SELECT send_task_reminder_emails();

-- Step 6: To view scheduled cron jobs:
-- SELECT * FROM cron.job;

-- Step 7: To unschedule the job (if needed):
-- SELECT cron.unschedule('daily-task-reminders');

-- Step 8: To view cron job history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

COMMENT ON FUNCTION send_task_reminder_emails() IS
'Sends daily email reminders for overdue, today, and upcoming tasks to all workspace members';
