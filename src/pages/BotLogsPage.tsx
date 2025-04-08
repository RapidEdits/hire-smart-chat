
import { useState, useEffect } from "react";
import { NavBar } from "@/components/NavBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Download, Ban, MessageSquare } from "lucide-react";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";

type ConversationMessage = {
  role: "bot" | "user";
  message: string;
  timestamp: string;
};

type Conversation = {
  id: string;
  phoneNumber: string;
  lastMessage: string;
  timestamp: string;
  status: string;
  flow?: ConversationMessage[];
};

const BotLogsPage = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationDetails, setConversationDetails] = useState<Conversation | null>(null);
  const [selectedTab, setSelectedTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const { toast } = useToast();

  const fetchConversations = async () => {
    setLoading(true);
    try {
      // Try to fetch from the backend
      const response = await axios.get('http://localhost:3000/conversations');
      setConversations(response.data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      
      // If in development/preview mode, use mock data
      if (import.meta.env.DEV || window.location.hostname.includes('lovableproject.com')) {
        console.log('Using mock conversation data');
        setConversations([
          { 
            id: "916200083509@c.us",
            phoneNumber: "916200083509",
            lastMessage: "Kindly forward me your CV.",
            timestamp: "2025-04-05T12:30:00",
            status: "active"
          },
          { 
            id: "919987257230@c.us",
            phoneNumber: "919987257230",
            lastMessage: "Ok, Which product are you currently handling?",
            timestamp: "2025-04-05T12:15:00",
            status: "active"
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      // Extract phone number from id
      const phoneNumber = id.includes('@c.us') ? id.split('@')[0] : id;
      
      // Try to fetch from the backend
      const response = await axios.get(`http://localhost:3000/conversation/${phoneNumber}`);
      setConversationDetails({
        id,
        phoneNumber,
        lastMessage: conversations.find(c => c.id === id)?.lastMessage || '',
        timestamp: conversations.find(c => c.id === id)?.timestamp || '',
        status: 'active',
        flow: response.data.flow || []
      });
    } catch (error) {
      console.error('Error fetching conversation details:', error);
      
      // If in development/preview mode, use mock data
      if (import.meta.env.DEV || window.location.hostname.includes('lovableproject.com')) {
        console.log('Using mock conversation details');
        if (id === "916200083509@c.us") {
          setConversationDetails({
            id,
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
          });
        } else if (id === "919987257230@c.us") {
          setConversationDetails({
            id,
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
          });
        }
      }
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    
    // Fetch conversations every 30 seconds
    const intervalId = setInterval(fetchConversations, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchConversationDetails(selectedConversation);
    } else if (conversations.length > 0) {
      setSelectedConversation(conversations[0].id);
    }
  }, [selectedConversation, conversations]);

  const activeConversations = conversations.filter(c => c.status === "active");
  const completedConversations = conversations.filter(c => c.status === "completed");

  const handleRefresh = () => {
    fetchConversations();
    toast({
      title: "Refreshed",
      description: "Conversation list has been refreshed",
    });
  };

  const handleBlockUser = (id: string) => {
    // In a real app, this would make an API call to block the user
    setConversations(prev => 
      prev.map(c => c.id === id ? {...c, status: "blocked"} : c)
    );
    
    if (selectedConversation === id) {
      setSelectedConversation(null);
    }
    
    toast({
      title: "User Blocked",
      description: `User ${id.split('@')[0]} has been blocked`,
      variant: "destructive",
    });
  };

  const handleExport = () => {
    if (!conversationDetails || !conversationDetails.flow) return;
    
    const conversationText = conversationDetails.flow
      .map(msg => `[${new Date(msg.timestamp).toLocaleString()}] ${msg.role.toUpperCase()}: ${msg.message}`)
      .join('\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation_${conversationDetails.phoneNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Conversation Exported",
      description: "The conversation has been exported to a text file",
    });
  };

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
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                  </div>
                ) : (
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
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {conversationDetails ? (
                    <span>Conversation with +{conversationDetails.phoneNumber}</span>
                  ) : (
                    <span>Conversation Details</span>
                  )}
                  
                  {conversationDetails && (
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleBlockUser(conversationDetails.id)}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
                <CardDescription>
                  {conversationDetails 
                    ? "Complete conversation history" 
                    : "Select a conversation to view details"}
                </CardDescription>
                <Separator />
              </CardHeader>
              <CardContent>
                {detailsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                  </div>
                ) : !conversationDetails ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Select a conversation from the list
                  </div>
                ) : !conversationDetails.flow || conversationDetails.flow.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No messages in this conversation
                  </div>
                ) : (
                  <div className="flex flex-col space-y-4 max-h-[500px] overflow-y-auto p-2">
                    {conversationDetails.flow.map((msg, idx) => (
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
