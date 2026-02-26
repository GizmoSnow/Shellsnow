import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log('Supabase config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Roadmap {
  id: string;
  user_id: string;
  title: string;
  data: RoadmapData;
  customer_logo_base64?: string;
  created_at: string;
  updated_at: string;
}

export interface RoadmapData {
  goals: Goal[];
  typeLabels?: Record<string, string>;
  typeColors?: Record<string, string>;
  quarterTitles?: {
    q1?: string;
    q2?: string;
    q3?: string;
    q4?: string;
  };
  successPathLabels?: {
    q1?: string;
    q2?: string;
    q3?: string;
    q4?: string;
  };
}

export interface Goal {
  id: string;
  number: string;
  title: string;
  color: string;
  initiatives: Initiative[];
}

export interface Initiative {
  id: string;
  label: string;
  activities: {
    q1: Activity[];
    q2: Activity[];
    q3: Activity[];
    q4: Activity[];
  };
  spanning?: SpanningActivity[];
}

export interface Activity {
  id: string;
  name: string;
  type: string;
  position?: 'full' | 'early' | 'mid' | 'late';
}

export interface SpanningActivity {
  id: string;
  name: string;
  type: string;
  quarters: string[];
}
