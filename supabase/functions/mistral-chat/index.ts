
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as csv from "https://deno.land/std@0.170.0/encoding/csv.ts";

const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sender, conversationHistory } = await req.json();
    
    // Read flow data from data.csv
    const dataResponse = await fetch("https://raw.githubusercontent.com/yourusername/your-repo/main/data.csv");
    const dataText = await dataResponse.text();
    const flowData = await csv.parse(dataText, { columns: true });
    
    // Read FAQ data from faq.csv
    const faqResponse = await fetch("https://raw.githubusercontent.com/yourusername/your-repo/main/faq.csv");
    const faqText = await faqResponse.text();
    const faqData = await csv.parse(faqText, { columns: true });
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get job profiles for context
    const { data: jobProfiles, error: jobError } = await supabase
      .from("job_profiles")
      .select("*");
      
    if (jobError) {
      console.error("Error fetching job profiles:", jobError);
      throw jobError;
    }

    // Prepare the system prompt using flow data and FAQ data
    let systemPrompt = `You are a helpful assistant for a job recruitment process. 

Your goal is to interview candidates according to this conversation flow:
${JSON.stringify(flowData)}

You have these FAQs to answer candidate questions:
${JSON.stringify(faqData)}

The job context is:
${JSON.stringify(jobProfiles)}

Follow these guidelines:
1. Stick to the conversation flow steps in order
2. If the candidate asks a question that matches an FAQ, respond with that information
3. Be professional but friendly
4. Your responses should be concise (max 3 sentences) and conversational
5. Do not mention that you are an AI, just act as a human recruiter named Pratyush`;

    // Prepare the conversation history for the API
    const apiMessages = [
      { role: "system", content: systemPrompt }
    ];
    
    // Add conversation history if available
    if (conversationHistory && conversationHistory.length > 0) {
      apiMessages.push(...conversationHistory);
    }
    
    // Add the current message
    apiMessages.push({ role: "user", content: message });

    // Call Mistral API
    const mistralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 150
      })
    });

    const mistralData = await mistralResponse.json();
    
    if (mistralResponse.status !== 200) {
      console.error("Mistral API error:", mistralData);
      throw new Error("Failed to get response from Mistral");
    }

    const assistantReply = mistralData.choices[0].message.content;

    // Save the conversation to the database
    const { error: saveError } = await supabase
      .from("conversations")
      .insert({
        sender: sender,
        message: message,
        response: assistantReply,
        timestamp: new Date().toISOString()
      });

    if (saveError) {
      console.error("Error saving conversation:", saveError);
    }

    return new Response(
      JSON.stringify({ 
        reply: assistantReply 
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
