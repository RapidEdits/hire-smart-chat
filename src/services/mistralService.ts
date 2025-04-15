
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
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY || ''}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Mistral AI Matching Error:', error);
      throw error;
    }
  },

  async chatWithCandidate(message: string, conversationHistory: any[] = [], flowData: any = null, faqData: any = null): Promise<string> {
    try {
      // Prepare the system prompt using flow data and FAQ data
      let systemPrompt = `You are a helpful assistant for a job recruitment process. 

Your goal is to interview candidates according to a specific conversation flow. 
Here is the conversation flow structure:
${JSON.stringify(flowData)}

You also have FAQs to answer candidate questions:
${JSON.stringify(faqData)}

Follow these guidelines:
1. Stick to the conversation flow steps
2. If the candidate asks a question that matches an FAQ, respond with that information
3. Be professional but friendly
4. Your responses should be concise (max 3 sentences) and conversational
5. Do not mention that you are an AI, just act as a human recruiter`;

      // Prepare the conversation history for the API
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ];

      const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
        model: 'mistral-small-latest',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 150
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY || ''}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Mistral AI Chat Error:', error);
      throw error;
    }
  }
};
