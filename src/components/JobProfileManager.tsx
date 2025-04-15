
import React, { useState, useEffect } from 'react';
import { jobProfileService, JobProfile } from '@/services/jobProfileService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useToast } from '@/hooks/use-toast';

export function JobProfileManager() {
  const [profiles, setProfiles] = useState<JobProfile[]>([]);
  const [newProfile, setNewProfile] = useState<Partial<JobProfile>>({
    title: '',
    description: '',
    requirements: [],
    location: '',
    department: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const fetchedProfiles = await jobProfileService.getProfiles();
      setProfiles(fetchedProfiles);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch job profiles',
        variant: 'destructive'
      });
    }
  };

  const handleCreateProfile = async () => {
    try {
      await jobProfileService.createProfile(newProfile as JobProfile);
      fetchProfiles();
      setNewProfile({
        title: '',
        description: '',
        requirements: [],
        location: '',
        department: ''
      });
      toast({
        title: 'Success',
        description: 'Job profile created successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create job profile',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Job Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Input 
              placeholder="Job Title" 
              value={newProfile.title || ''} 
              onChange={(e) => setNewProfile({...newProfile, title: e.target.value})}
            />
            <Input 
              placeholder="Description" 
              value={newProfile.description || ''} 
              onChange={(e) => setNewProfile({...newProfile, description: e.target.value})}
            />
            <Button onClick={handleCreateProfile}>Create Profile</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Job Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.map(profile => (
            <div key={profile.id} className="border p-2 mb-2">
              <h3>{profile.title}</h3>
              <p>{profile.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
