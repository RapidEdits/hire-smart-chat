
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { Sparkles, AlertCircle } from "lucide-react";

export function MistralToggle() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Get current Mistral status
    axios.get("http://localhost:3000/mistral-status")
      .then(response => {
        setIsEnabled(response.data.enabled);
        setIsApiKeyConfigured(response.data.apiKeyConfigured);
      })
      .catch(error => {
        console.error("Error fetching Mistral status:", error);
        toast({
          title: "Connection Error",
          description: "Could not connect to the server to check Mistral status.",
          variant: "destructive"
        });
      });
  }, []);

  const handleToggle = async () => {
    if (!isApiKeyConfigured) {
      toast({
        title: "API Key Required",
        description: "Please configure the Mistral API key first.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post("http://localhost:3000/toggle-mistral", {
        enabled: !isEnabled
      });
      
      if (response.data.success) {
        setIsEnabled(!isEnabled);
        toast({
          title: !isEnabled ? "Mistral AI Enabled" : "Mistral AI Disabled",
          description: !isEnabled 
            ? "WhatsApp chat now uses Mistral AI for responses" 
            : "WhatsApp chat now uses rule-based responses",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to toggle Mistral AI.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error toggling Mistral:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to the server.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
          Mistral AI Integration
        </CardTitle>
        <CardDescription>
          Use Mistral AI to power your WhatsApp chatbot responses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!isApiKeyConfigured && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex items-start">
              <AlertCircle className="w-5 h-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                Mistral API key is not configured. Please set the MISTRAL_API_KEY environment variable.
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable Mistral AI</div>
              <div className="text-sm text-gray-500">
                When enabled, the WhatsApp bot will use Mistral AI to generate responses
              </div>
            </div>
            <Switch 
              checked={isEnabled} 
              onCheckedChange={handleToggle}
              disabled={isLoading || !isApiKeyConfigured}
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-md text-sm">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Mistral AI will handle the entire conversation flow</li>
              <li>Uses your data.csv and faq.csv files as knowledge base</li>
              <li>Fully context-aware and maintains conversation history</li>
              <li>More natural and flexible than rule-based responses</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
