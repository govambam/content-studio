-- Add 'system' to chat_role enum for system events in activity thread
alter type chat_role add value if not exists 'system';

-- Add change_summary column for inline content update notices
alter table chat_messages add column if not exists change_summary text;
