
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { QRCodeConnect } from "./QRCodeConnect";
import { useToast } from "./ui/use-toast";
import { Loader2, MessageCircle } from "lucide-react";

export function WhatsAppBot() {
  const [botStatus, setBotStatus] = useState<"idle" | "initializing" | "running" | "error">("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const { toast } = useToast();

  // Mock function to start the bot (in a real app, this would make an API call)
  const startBot = () => {
    setBotStatus("initializing");
    setLogs(prev => [...prev, "Starting WhatsApp bot..."]);
    
    // Simulate initialization
    setTimeout(() => {
      setBotStatus("running");
      setLogs(prev => [...prev, "WhatsApp bot is ready and running"]);
      toast({
        title: "Bot Started",
        description: "WhatsApp bot is now running and ready to process messages.",
      });
    }, 2000);
  };

  const stopBot = () => {
    setBotStatus("idle");
    setLogs(prev => [...prev, "WhatsApp bot stopped"]);
    setConnected(false);
    toast({
      title: "Bot Stopped",
      description: "WhatsApp bot has been stopped.",
    });
  };

  const handleConnect = () => {
    setConnected(true);
    startBot();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
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
                onClick={stopBot}
              >
                Disconnect
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            Bot Status
          </CardTitle>
          <CardDescription>
            Current status of the WhatsApp chatbot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${
                botStatus === "running" ? "bg-green-500" : 
                botStatus === "initializing" ? "bg-yellow-500" : 
                botStatus === "error" ? "bg-red-500" : "bg-gray-400"
              }`}></div>
              <span className="font-medium capitalize">{botStatus}</span>
            </div>
            
            {botStatus === "initializing" && (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            )}
          </div>
          
          <div className="border rounded-md p-2 h-48 overflow-y-auto bg-black/5 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-gray-400 italic p-2">No logs yet</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="py-1 border-b border-black/10 last:border-0">
                  <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log}
                </div>
              ))
            )}
          </div>
          
          <div className="mt-4 flex space-x-2">
            {botStatus !== "running" && (
              <Button 
                onClick={startBot} 
                className="bg-whatsapp hover:bg-whatsapp-dark"
                disabled={botStatus === "initializing"}
              >
                {botStatus === "initializing" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing
                  </>
                ) : "Start Bot"}
              </Button>
            )}
            
            {botStatus === "running" && (
              <Button 
                onClick={stopBot}
                variant="destructive"
              >
                Stop Bot
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
