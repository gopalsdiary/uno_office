
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tschsyozvlneslqylqii.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzY2hzeW96dmxuZXNscXlscWlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MzcyNjgsImV4cCI6MjA4MjMxMzI2OH0.7kfq7K-jbFmgnin2zkLJf7GIulGXvfQzBkzjs0iAO14';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
