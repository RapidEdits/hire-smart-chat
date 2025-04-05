
import { NavBar } from "@/components/NavBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppBot } from "@/components/WhatsAppBot";
import { BotSettings } from "@/components/BotSettings";
import { ConversationFlow } from "@/components/ConversationFlow";
import { NumbersUpload } from "@/components/NumbersUpload";

const WhatsAppBotPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">WhatsApp Bot Management</h1>
        
        <Tabs defaultValue="connect" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="connect">Connect</TabsTrigger>
            <TabsTrigger value="numbers">Numbers</TabsTrigger>
            <TabsTrigger value="flow">Conversation Flow</TabsTrigger>
            <TabsTrigger value="settings">Bot Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="connect">
            <WhatsAppBot />
          </TabsContent>
          
          <TabsContent value="numbers">
            <NumbersUpload />
          </TabsContent>
          
          <TabsContent value="flow">
            <ConversationFlow />
          </TabsContent>
          
          <TabsContent value="settings">
            <BotSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WhatsAppBotPage;
