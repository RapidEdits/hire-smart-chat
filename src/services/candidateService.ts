
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type CandidateQualification = {
  experience: number;
  ctc: number;
  notice: number;
  product: string;
  qualified: boolean;
};

// Define a Candidate type that will be compatible with our frontend
export type Candidate = {
  id: number;
  name: string;
  phone: string;
  company?: string;
  experience?: string;
  ctc?: string;
  product?: string;
  notice?: string;
  qualified: boolean;
  interview_scheduled?: boolean;
  date_added?: string;
};

export const storeCandidate = async (phone: string, answers: Record<string, any>) => {
  try {
    // Clean up phone number (remove '@c.us' if present)
    const cleanPhone = phone.split('@')[0];
    
    // Prepare candidate data for Supabase
    const candidateData = {
      phone: cleanPhone,
      name: answers.company || 'Unknown', // Using company as name since that's what we have
      experience: answers.experience || null,
      ctc: answers.ctc || null,
      notice_period: answers.notice || null,
      qualification: answers.qualified ? 'qualified' : 'not_qualified',
      status: 'new'
    };
    
    // Store in Supabase
    const { data, error } = await supabase
      .from('candidates')
      .upsert(candidateData, {
        onConflict: 'phone'
      });
      
    if (error) {
      console.error('Error storing candidate in Supabase:', error);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Error in storeCandidate:', err);
    throw err;
  }
};

export const getQualifiedCandidates = async (): Promise<Candidate[]> => {
  try {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('qualification', 'qualified')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching qualified candidates:', error);
      throw error;
    }

    // Map Supabase data to our Candidate type
    return (data || []).map(candidate => ({
      id: candidate.id,
      name: candidate.name,
      phone: candidate.phone,
      company: candidate.name, // Using name as company since that's how we stored it
      experience: candidate.experience || '',
      ctc: candidate.ctc || '',
      notice: candidate.notice_period || '',
      qualified: candidate.qualification === 'qualified',
      interview_scheduled: false, // Default value since we don't have this information yet
      date_added: candidate.created_at
    }));
  } catch (err) {
    console.error('Error in getQualifiedCandidates:', err);
    throw err;
  }
};

export const getCandidateStats = async () => {
  try {
    const { count: qualifiedCount } = await supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .eq('qualification', 'qualified');

    const { count: totalCount } = await supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true });

    return {
      qualified: qualifiedCount || 0,
      total: totalCount || 0
    };
  } catch (err) {
    console.error('Error in getCandidateStats:', err);
    throw err;
  }
};
