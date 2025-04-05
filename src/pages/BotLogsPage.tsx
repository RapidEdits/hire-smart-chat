
import { useState, useEffect } from "react";
import { NavBar } from "@/components/NavBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Download, Ban, MessageSquare } from "lucide-react";

// Mock data for conversation logs
const mockConversations = [
  { 
    id: "1",
    phoneNumber: "916200083509",
    lastMessage: "Kindly forward me your CV.",
    timestamp: "2025-04-05T12:30:00",
    status: "active",
    flow: [
      { role: "bot", message: "Hi Pratyush here, I got your number from Naukri.com.", timestamp: "2025-04-05T12:25:00" },
      { role: "bot", message: "I messaged you regarding a job opening in Shubham Housing Finance for the profile of Relationship Manager / Sales Manager in Home Loan, LAP and Mortgage.", timestamp: "2025-04-05T12:25:30" },
      { role: "bot", message: "Are you interested in Kota Location?", timestamp: "2025-04-05T12:26:00" },
      { role: "user", message: "Yes, I am interested", timestamp: "2025-04-05T12:27:00" },
      { role: "bot", message: "Currently in which company are you working?", timestamp: "2025-04-05T12:27:30" },
      { role: "user", message: "HDFC Bank", timestamp: "2025-04-05T12:28:00" },
      { role: "bot", message: "Ok and your notice period?", timestamp: "2025-04-05T12:28:30" },
      { role: "user", message: "30 days", timestamp: "2025-04-05T12:29:00" },
      { role: "bot", message: "Ok, What's your current CTC?", timestamp: "2025-04-05T12:29:30" },
      { role: "user", message: "8 LPA", timestamp: "2025-04-05T12:30:00" },
    ]
  },
  { 
    id: "2",
    phoneNumber: "919987257230",
    lastMessage: "Ok, Which product are you currently handling?",
    timestamp: "2025-04-05T12:15:00",
    status: "active",
    flow: [
      { role: "bot", message: "Hi Pratyush here, I got your number from Naukri.com.", timestamp: "2025-04-05T12:10:00" },
      { role: "bot", message: "I messaged you regarding a job opening in Shubham Housing Finance for the profile of Relationship Manager / Sales Manager in Home Loan, LAP and Mortgage.", timestamp: "2025-04-05T12:10:30" },
      { role: "bot", message: "Are you interested in Kota Location?", timestamp: "2025-04-05T12:11:00" },
      { role: "user", message: "Yes", timestamp: "2025-04-05T12:12:00" },
      { role: "bot", message: "Currently in which company are you working?", timestamp: "2025-04-05T12:12:30" },
      { role: "user", message: "ICICI Bank", timestamp: "2025-04-05T12:13:00" },
      { role: "bot", message: "Ok and your notice period?", timestamp: "2025-04-05T12:13:30" },
      { role: "user", message: "45 days", timestamp: "2025-04-05T12:14:00" },
      { role: "bot", message: "Ok, What's your current CTC?", timestamp: "2025-04-05T12:14:30" },
      { role: "user", message: "9 LPA", timestamp: "2025-04-05T12:15:00" },
    ]
  }
];

const BotLogsPage = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState(mockConversations);
  const [selectedTab, setSelectedTab] = useState("active");

  const activeConversations = conversations.filter(c => c.status === "active");
  const completedConversations = conversations.filter(c => c.status === "completed");

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  const handleRefresh = () => {
    // In a real app, this would fetch fresh data from the server
    console.log("Refreshing conversation logs");
  };

  const handleBlockUser = (id: string) => {
    // In a real app, this would make an API call to block the user
    setConversations(prev => 
      prev.map(c => c.id === id ? {...c, status: "blocked"} : c)
    );
    
    if (selectedConversation === id) {
      setSelectedConversation(null);
    }
  };

  const handleExport = () => {
    // In a real app, this would export the conversation logs
    if (!currentConversation) return;
    
    const conversationText = currentConversation.flow
      .map(msg => `[${msg.timestamp}] ${msg.role.toUpperCase()}: ${msg.message}`)
      .join('\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation_${currentConversation.phoneNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0].id);
    }
  }, [conversations, selectedConversation]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Bot Conversations</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Conversations</span>
                  <Button size="sm" variant="outline" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <CardDescription>
                  Active and completed bot conversations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="active" onValueChange={setSelectedTab}>
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="active">
                      Active ({activeConversations.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                      Completed ({completedConversations.length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="active" className="mt-4">
                    {activeConversations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No active conversations
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeConversations.map((conv) => (
                          <div
                            key={conv.id}
                            className={`p-3 rounded-md cursor-pointer transition-colors ${
                              selectedConversation === conv.id
                                ? "bg-whatsapp text-white"
                                : "hover:bg-gray-100"
                            }`}
                            onClick={() => setSelectedConversation(conv.id)}
                          >
                            <div className="font-medium">+{conv.phoneNumber}</div>
                            <div className="text-sm truncate">
                              {conv.lastMessage}
                            </div>
                            <div className="text-xs mt-1 opacity-80">
                              {new Date(conv.timestamp).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="completed" className="mt-4">
                    {completedConversations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No completed conversations
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {completedConversations.map((conv) => (
                          <div
                            key={conv.id}
                            className={`p-3 rounded-md cursor-pointer transition-colors ${
                              selectedConversation === conv.id
                                ? "bg-whatsapp text-white"
                                : "hover:bg-gray-100"
                            }`}
                            onClick={() => setSelectedConversation(conv.id)}
                          >
                            <div className="font-medium">+{conv.phoneNumber}</div>
                            <div className="text-sm truncate">
                              Completed
                            </div>
                            <div className="text-xs mt-1 opacity-80">
                              {new Date(conv.timestamp).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {currentConversation ? (
                    <span>Conversation with +{currentConversation.phoneNumber}</span>
                  ) : (
                    <span>Conversation Details</span>
                  )}
                  
                  {currentConversation && (
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleBlockUser(currentConversation.id)}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
                <CardDescription>
                  {currentConversation 
                    ? "Complete conversation history" 
                    : "Select a conversation to view details"}
                </CardDescription>
                <Separator />
              </CardHeader>
              <CardContent>
                {!currentConversation ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Select a conversation from the list
                  </div>
                ) : (
                  <div className="flex flex-col space-y-4 max-h-[500px] overflow-y-auto p-2">
                    {currentConversation.flow.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex ${msg.role === "bot" ? "justify-start" : "justify-end"}`}
                      >
                        <div 
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.role === "bot" 
                              ? "bg-gray-200 text-black" 
                              : "bg-whatsapp text-white"
                          }`}
                        >
                          <div className="text-sm">{msg.message}</div>
                          <div className="text-xs mt-1 opacity-70">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotLogsPage;
