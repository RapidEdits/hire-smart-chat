
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { useForm } from "react-hook-form";
import { useToast } from "./ui/use-toast";

type BotSettings = {
  adminNumber: string;
  initialMessages: string;
  autoStart: boolean;
  numbersPerBatch: number;
  messageDelay: number;
};

export function BotSettings() {
  const { toast } = useToast();
  
  const form = useForm<BotSettings>({
    defaultValues: {
      adminNumber: "916200083509",
      initialMessages: "Hi Pratyush here, I got your number from Naukri.com.\n\nI messaged you regarding a job opening in Shubham Housing Finance for the profile of Relationship Manager / Sales Manager in Home Loan, LAP and Mortgage.\n\nAre you interested in Kota Location?",
      autoStart: false,
      numbersPerBatch: 10,
      messageDelay: 1000,
    },
  });

  const onSubmit = (data: BotSettings) => {
    toast({
      title: "Settings saved",
      description: "Your WhatsApp bot settings have been updated successfully.",
    });
    console.log(data);
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
                      <Input type="number" min={1} max={50} {...field} />
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
                      <Input type="number" min={500} max={5000} step={100} {...field} />
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
      </CardContent>
    </Card>
  );
}
