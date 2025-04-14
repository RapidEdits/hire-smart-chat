
import { supabase } from "@/integrations/supabase/client";

export type CandidateQualification = {
  experience: number;
  ctc: number;
  notice: number;
  product: string;
  qualified: boolean;
};

export const storeCandidate = async (phone: string, answers: Record<string, any>) => {
  try {
    const { data, error } = await supabase.from('candidates').upsert({
      phone: phone.split('@')[0],
      name: answers.company || 'Unknown', // Using company as name since that's what we have
      experience: answers.experience,
      ctc: answers.ctc,
      notice_period: answers.notice,
      qualification: answers.qualified ? 'qualified' : 'not_qualified',
      status: 'new',
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'phone'
    });

    if (error) {
      console.error('Error storing candidate:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Error in storeCandidate:', err);
    throw err;
  }
};
