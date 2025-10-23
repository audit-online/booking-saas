import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xkiscmpsggsxpbqkydpw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhraXNjbXBzZ2dzeHBicWt5ZHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzI1NTAsImV4cCI6MjA3NjYwODU1MH0.h4cTKfdXErSY27kOIob7QwXo5oO3zdm0Uo2trVgOw8M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
