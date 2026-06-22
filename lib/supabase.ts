import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// anon 키는 공개 키(클라이언트 노출 전제). 실제 보안은 Supabase RLS가 담당한다.
const SUPABASE_URL = 'https://xhtysstiiuhmmdpxfbtp.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhodHlzc3RpaXVobW1kcHhmYnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MTMyNzAsImV4cCI6MjA5Njk4OTI3MH0.5XfxYSQF6NDrIIiSmzrisZh3aeR7dQnVVn9n40YU4Lw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // RN은 URL 세션 감지 불필요
  },
});
