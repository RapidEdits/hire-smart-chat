
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { QRCodeConnect } from "./QRCodeConnect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { FileSpreadsheet, MessageSquare, Users, Bot } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { useNavigate } from "react-router-dom";

export function Dashboard() {
  const [connected, setConnected] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const handleConnect = () => {
    setConnected(true);
    toast({
      title: "Connected Successfully",
      description: "WhatsApp is now connected and ready to handle conversations.",
    });
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">0</div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">0</div>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Interview Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">0</div>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-whatsapp/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              WhatsApp Bot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{connected ? "Active" : "Inactive"}</div>
              <Bot className="h-4 w-4 text-whatsapp" />
            </div>
            <Button 
              variant="link" 
              className="text-whatsapp p-0 h-auto text-xs mt-2"
              onClick={() => navigate("/whatsapp-bot")}
            >
              Manage Bot
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          {!connected ? (
            <QRCodeConnect onConnect={handleConnect} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="relative flex h-3 w-3 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-whatsapp opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-whatsapp"></span>
                  </span>
                  WhatsApp Connected
                </CardTitle>
                <CardDescription>
                  Your WhatsApp is connected and the chatbot is active
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setConnected(false)}
                >
                  Disconnect
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="md:col-span-2">
          <Tabs defaultValue="recent" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="recent">Recent Activity</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming Interviews</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recent" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    View recent candidate interactions and events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity to display
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="upcoming" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Interviews</CardTitle>
                  <CardDescription>
                    Interviews scheduled for the coming days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    No upcoming interviews scheduled
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="stats" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Statistics</CardTitle>
                  <CardDescription>
                    Metrics and statistics for your chatbot
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    No statistics available yet
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
