
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { QRCodeConnect } from "./QRCodeConnect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { FileSpreadsheet, MessageSquare, Users, Bot, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { useNavigate } from "react-router-dom";
import axios from "axios";

type Candidate = {
  id: number;
  name: string;
  phone: string;
  company: string;
  experience: string;
  ctc: string;
  qualified: boolean;
  interview_scheduled: boolean;
};

export function Dashboard() {
  const [connected, setConnected] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [qualifiedCandidates, setQualifiedCandidates] = useState<Candidate[]>([]);
  const [activeChatCount, setActiveChatCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Function to fetch candidates data
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Check if Python server is running before making API calls
        const pingResponse = await axios.get('http://localhost:5000/ping');
        
        if (pingResponse.status === 200) {
          // Get all candidates
          const candidatesResponse = await axios.get('http://localhost:5000/candidates');
          setCandidates(candidatesResponse.data || []);
          
          // Get qualified candidates
          const qualifiedResponse = await axios.get('http://localhost:5000/qualified-candidates');
          setQualifiedCandidates(qualifiedResponse.data || []);
          
          // Get active chats count (number of files in state.json that aren't completed)
          const stateResponse = await axios.get('http://localhost:3000/active-chats');
          setActiveChatCount(stateResponse.data?.count || 0);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Initialize with empty arrays if server is not running
        setCandidates([]);
        setQualifiedCandidates([]);
        setActiveChatCount(0);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up an interval to refresh data every 30 seconds
    const intervalId = setInterval(fetchData, 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
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
              <div className="text-2xl font-bold">{candidates.length}</div>
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
              <div className="text-2xl font-bold">{activeChatCount}</div>
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
              <div className="text-2xl font-bold">{qualifiedCandidates.length}</div>
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
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                    </div>
                  ) : candidates.length > 0 ? (
                    <div className="space-y-4">
                      {candidates.slice(0, 5).map((candidate) => (
                        <div key={candidate.id} className="flex items-center justify-between border-b pb-2">
                          <div>
                            <p className="font-medium">{candidate.company}</p>
                            <p className="text-sm text-muted-foreground">{candidate.phone}</p>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs ${
                            candidate.qualified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {candidate.qualified ? 'Qualified' : 'Not Qualified'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent activity to display
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="upcoming" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Interviews</CardTitle>
                  <CardDescription>
                    Interviews scheduled for qualified candidates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                    </div>
                  ) : qualifiedCandidates.length > 0 ? (
                    <div className="space-y-4">
                      {qualifiedCandidates.map((candidate) => (
                        <div key={candidate.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                          <div className="flex items-start">
                            <Calendar className="h-4 w-4 mr-2 mt-1 text-green-600" />
                            <div>
                              <p className="font-medium">{candidate.company}</p>
                              <p className="text-sm text-muted-foreground">
                                {candidate.phone} • {candidate.experience} exp • {candidate.ctc} CTC
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">Schedule</Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No upcoming interviews scheduled
                    </div>
                  )}
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
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Total Candidates</p>
                        <p className="text-2xl font-bold">{candidates.length}</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Qualification Rate</p>
                        <p className="text-2xl font-bold">
                          {candidates.length > 0 
                            ? `${Math.round((qualifiedCandidates.length / candidates.length) * 100)}%` 
                            : '0%'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Qualification Criteria:</p>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Minimum experience: 2 years</li>
                        <li>• Minimum CTC: 5 LPA</li>
                        <li>• Maximum notice period: 60 days</li>
                      </ul>
                    </div>
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
