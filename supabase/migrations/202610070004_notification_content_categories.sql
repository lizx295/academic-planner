alter table public.notification_preferences
  alter column categories set default '{"announcements":true,"messages":true,"discussions":true,"contentUpdates":true,"grades":true,"deadlines":true,"classReminders":true}'::jsonb;

update public.notification_preferences
set categories = '{"discussions":true,"contentUpdates":true}'::jsonb || categories
where not (categories ? 'discussions') or not (categories ? 'contentUpdates');
