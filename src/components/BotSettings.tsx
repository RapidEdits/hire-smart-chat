
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { useForm } from "react-hook-form";
import { useToast } from "./ui/use-toast";
import axios from "axios";

type BotSettingsType = {
  adminNumber: string;
  initialMessages: string;
  autoStart: boolean;
  numbersPerBatch: number;
  messageDelay: number;
};

export function BotSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  const form = useForm<BotSettingsType>({
    defaultValues: {
      adminNumber: "916200083509",
      initialMessages: "Hi Pratyush here, I got your number from Naukri.com.\n\nI messaged you regarding a job opening in Shubham Housing Finance for the profile of Relationship Manager / Sales Manager in Home Loan, LAP and Mortgage.\n\nAre you interested in Kota Location?",
      autoStart: false,
      numbersPerBatch: 10,
      messageDelay: 1000,
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:3000/settings');
        if (response.data) {
          // Format initial messages if it's an array
          let initialMessages = response.data.initialMessages;
          if (Array.isArray(initialMessages)) {
            initialMessages = initialMessages.join('\n\n');
          }
          
          // Update form with data from server
          form.reset({
            adminNumber: response.data.adminNumber || "916200083509",
            initialMessages: initialMessages,
            autoStart: response.data.autoStart || false,
            numbersPerBatch: response.data.numbersPerBatch || 10,
            messageDelay: response.data.messageDelay || 1000,
          });
        }
      } catch (error) {
        console.error('Error fetching bot settings:', error);
        // Fallback to default values
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [form]);

  const onSubmit = async (data: BotSettingsType) => {
    try {
      // Convert initialMessages from string to array
      const initialMessagesArray = data.initialMessages
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      await axios.post('http://localhost:3000/settings', {
        adminNumber: data.adminNumber,
        initialMessages: initialMessagesArray,
        autoStart: data.autoStart,
        numbersPerBatch: data.numbersPerBatch,
        messageDelay: data.messageDelay,
      });
      
      toast({
        title: "Settings saved",
        description: "Your WhatsApp bot settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving bot settings:', error);
      toast({
        title: "Error saving settings",
        description: "There was a problem saving your bot settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bot Configuration</CardTitle>
        <CardDescription>
          Configure the WhatsApp bot behavior and messages
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="adminNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin WhatsApp Number</FormLabel>
                    <FormControl>
                      <Input placeholder="91XXXXXXXXXX" {...field} />
                    </FormControl>
                    <FormDescription>
                      Admin number to receive notifications (with country code, no + symbol)
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="initialMessages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Messages</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter the initial messages to send..." 
                        rows={5}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Each line will be sent as a separate message
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numbersPerBatch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numbers Per Batch</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={50} {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        How many numbers to process in one batch
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="messageDelay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message Delay (ms)</FormLabel>
                      <FormControl>
                        <Input type="number" min={500} max={5000} step={100} {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Delay between messages in milliseconds
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="autoStart"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Auto-start Bot</FormLabel>
                      <FormDescription>
                        Automatically start the bot when numbers are uploaded
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="bg-whatsapp hover:bg-whatsapp-dark">
                Save Settings
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
