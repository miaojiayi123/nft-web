import { supabase } from '@/lib/supabaseClient';

export type ActionType = 'MINT' | 'STAKE' | 'CLAIM' | 'TRANSFER';

interface LogParams {
  address: string;
  type: ActionType;
  details: string;
  hash?: string;
}

export const logActivity = async ({ address, type, details, hash }: LogParams) => {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert([
        {
          wallet_address: address,
          action_type: type,
          details: details,
          tx_hash: hash,
        },
      ]);
    
    if (error) throw error;
    console.log(`[Activity Logged] ${type}: ${details}`);
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
};