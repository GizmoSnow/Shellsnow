import { createClient } from '@supabase/supabase-js';
import type { ActivityTypeMetadata } from './activity-types';

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
  fiscal_start_month: number;
  base_fiscal_year: number;
  roadmap_start_quarter: number;
  created_at: string;
  updated_at: string;
}

export interface OrgRow {
  id: string;
  accountName: string;
  products: string;
  instanceUrl: string;
  maintenanceUrl: string;
  orgId: string;
  notes: string;
}

export interface TeamMember {
  id: string;
  photoUrl?: string;
  name: string;
  title: string;
  pronouns?: string;
  email?: string;
  phone?: string;
}

export interface AccountDetailsData {
  orgRows: OrgRow[];
  salesforceTeam: TeamMember[];
  customerTeam: TeamMember[];
}

export interface RoadmapData {
  goals: Goal[];
  accountSpanning?: SpanningActivity[];
  customActivityTypes?: ActivityTypeMetadata[];
  typeLabels?: Record<string, string>;
  typeColors?: Record<string, string>;
  typeOwners?: Record<string, 'salesforce' | 'customer' | 'partner'>;
  headerColor?: string;
  backgroundColor?: string;
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
  accountDetails?: AccountDetailsData;
}

export interface Goal {
  id: string;
  number: string;
  title: string;
  color: string;
  initiatives: Initiative[];
  activities?: {
    q1: Activity[];
    q2: Activity[];
    q3: Activity[];
    q4: Activity[];
  };
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
  owner?: 'salesforce' | 'partner' | 'customer';
  position?: 'full' | 'early' | 'mid' | 'late';
  start_month?: number;
  end_month?: number;
  health?: 'on_track' | 'at_risk' | 'blocked';
  status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  completedDate?: string;
  description?: string;
  isCriticalPath?: boolean;
  sourceType?: 'engagement' | 'support' | 'training' | 'manual';
  sourceSystem?: string;
  sourceRecordId?: string;
}

export interface SpanningActivity {
  id: string;
  name: string;
  type: string;
  owner?: 'salesforce' | 'partner' | 'customer';
  quarters: string[];
  start_month?: number;
  end_month?: number;
  health?: 'on_track' | 'at_risk' | 'blocked';
  status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  completedDate?: string;
  description?: string;
  isCriticalPath?: boolean;
  sourceType?: 'engagement' | 'support' | 'training' | 'manual';
  sourceSystem?: string;
  sourceRecordId?: string;
}
