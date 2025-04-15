
import axios from 'axios';

export const mistralService = {
  async matchProfile(candidateProfile: any, jobProfiles: any[]): Promise<any> {
    try {
      const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system', 
            content: 'You are an expert job profile matching assistant. Evaluate the candidate profile against multiple job descriptions and provide a detailed match score and reasoning.'
          },
          {
            role: 'user',
            content: JSON.stringify({
              candidateProfile,
              jobProfiles
            })
          }
        ],
        temperature: 0.5
      }, {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('MISTRAL_API_KEY')}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Mistral AI Matching Error:', error);
      throw error;
    }
  }
};
