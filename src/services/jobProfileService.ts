
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
    
    // Transform the data to ensure salary_range is properly typed
    return (data || []).map(profile => ({
      id: profile.id,
      title: profile.title,
      description: profile.description,
      requirements: profile.requirements,
      salary_range: typeof profile.salary_range === 'string' 
        ? JSON.parse(profile.salary_range) 
        : profile.salary_range,
      location: profile.location,
      department: profile.department
    }));
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
    
    // Transform to ensure correct typing
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      salary_range: typeof data.salary_range === 'string' 
        ? JSON.parse(data.salary_range) 
        : data.salary_range,
      location: data.location,
      department: data.department
    };
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
    
    // Transform to ensure correct typing
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      salary_range: typeof data.salary_range === 'string' 
        ? JSON.parse(data.salary_range) 
        : data.salary_range,
      location: data.location,
      department: data.department
    };
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
