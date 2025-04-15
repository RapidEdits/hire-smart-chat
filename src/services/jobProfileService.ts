
import { supabase } from "@/integrations/supabase/client";

export interface JobProfile {
  id?: string;
  title: string;
  description: string;
  requirements: string[];
  salary_range: {
    min: number;
    max: number;
  };
  location: string;
  department: string;
}

export const jobProfileService = {
  async getProfiles(): Promise<JobProfile[]> {
    const { data, error } = await supabase
      .from('job_profiles')
      .select('*');
    
    if (error) {
      console.error('Error fetching job profiles:', error);
      throw error;
    }
    
    return data || [];
  },

  async createProfile(profile: JobProfile): Promise<JobProfile> {
    const { data, error } = await supabase
      .from('job_profiles')
      .insert(profile)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating job profile:', error);
      throw error;
    }
    
    return data;
  },

  async updateProfile(id: string, profile: Partial<JobProfile>): Promise<JobProfile> {
    const { data, error } = await supabase
      .from('job_profiles')
      .update(profile)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating job profile:', error);
      throw error;
    }
    
    return data;
  },

  async deleteProfile(id: string): Promise<void> {
    const { error } = await supabase
      .from('job_profiles')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting job profile:', error);
      throw error;
    }
  }
};
