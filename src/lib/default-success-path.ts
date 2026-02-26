import type { SuccessPathItem } from './supabase';

export function createDefaultSuccessPathItems(): SuccessPathItem[] {
  return [
    { id: 'sp1', label: 'Success Path', quarter: 'q1' },
    { id: 'sp2', label: 'Success Path Review', quarter: 'q2' },
    { id: 'sp3', label: 'Success Path Review', quarter: 'q3' },
    { id: 'sp4', label: 'Success Path Review', quarter: 'q4' }
  ];
}
