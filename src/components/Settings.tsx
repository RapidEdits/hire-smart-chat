
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "./ui/form";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useForm } from "react-hook-form";
import { useToast } from "./ui/use-toast";
import axios from "axios";
import { BotSettings } from "./BotSettings";

type ChatbotSettings = {
  qualification: {
    ctcThreshold: number;
    experienceThreshold: number;
    incentiveThreshold: number;
  }
};

export function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  const form = useForm<ChatbotSettings>({
    defaultValues: {
      qualification: {
        ctcThreshold: 5,
        experienceThreshold: 2,
        incentiveThreshold: 5000,
      }
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:3000/settings');
        if (response.data) {
          // Update form with data from server
          const settings = response.data;
          form.reset({
            qualification: {
              ctcThreshold: settings.qualification?.ctcThreshold || 5,
              experienceThreshold: settings.qualification?.experienceThreshold || 2,
              incentiveThreshold: settings.qualification?.incentiveThreshold || 5000,
            }
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        // Fallback to default values
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [form]);

  const onSubmit = async (data: ChatbotSettings) => {
    try {
      await axios.post('http://localhost:3000/settings', {
        qualification: data.qualification
      });
      
      toast({
        title: "Settings saved",
        description: "Your chatbot settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error saving settings",
        description: "There was a problem saving your settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="chatbot" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="chatbot">Chatbot Settings</TabsTrigger>
          <TabsTrigger value="integrations">WhatsApp Integration</TabsTrigger>
          <TabsTrigger value="templates">Message Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chatbot">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Candidate Screening Settings</CardTitle>
                <CardDescription>
                  Configure the minimum requirements for candidate qualification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="qualification.ctcThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum CTC (in LPA)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" {...field} />
                          </FormControl>
                          <FormDescription>
                            The minimum CTC requirement for candidates to qualify
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="qualification.experienceThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Experience (in years)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.5" {...field} />
                          </FormControl>
                          <FormDescription>
                            The minimum years of experience required
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="qualification.incentiveThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Incentive (in ₹)</FormLabel>
                          <FormControl>
                            <Input type="number" step="100" {...field} />
                          </FormControl>
                          <FormDescription>
                            The minimum incentive amount received in last 6 months
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="bg-whatsapp hover:bg-whatsapp-dark">
                      Save Changes
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Integration</CardTitle>
              <CardDescription>
                Configure your WhatsApp connection settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  WhatsApp integration is currently handled through the QR code scanning method on the dashboard.
                  Future versions will support direct API integration with WhatsApp Business API.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="templates">
          <BotSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
