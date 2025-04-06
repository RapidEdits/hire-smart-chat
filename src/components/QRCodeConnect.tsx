
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Loader2, QrCode, RefreshCw, Smartphone, Server } from "lucide-react";
import { whatsAppService } from "@/services/whatsappService";
import { useToast } from "@/hooks/use-toast";

type QRCodeConnectProps = {
  onConnect: () => void;
};

export function QRCodeConnect({ onConnect }: QRCodeConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [serverStatus, setServerStatus] = useState<{
    nodeServer: boolean;
    pythonServer: boolean;
  }>({ nodeServer: false, pythonServer: false });
  const [startingServers, setStartingServers] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check initial connection status
    whatsAppService.getStatus().then(({ isConnected }) => {
      if (isConnected) {
        setConnected(true);
        onConnect();
      }
    });

    // Check initial server status
    whatsAppService.getServerStatus().then((status) => {
      setServerStatus(status);
    });

    // Set up WebSocket listeners
    const qrUnsubscribe = whatsAppService.on('qrCode', (data: { qrDataURL: string }) => {
      setQrCodeUrl(data.qrDataURL);
      setStartingServers(false);
    });

    const statusUnsubscribe = whatsAppService.on('connectionStatus', (data: { isConnected: boolean }) => {
      setConnected(data.isConnected);
      if (data.isConnected) {
        onConnect();
        toast({
          title: "WhatsApp Connected",
          description: "WhatsApp is now connected and ready to use."
        });
      }
    });

    const authUnsubscribe = whatsAppService.on('authenticated', () => {
      toast({
        title: "WhatsApp Authenticated",
        description: "WhatsApp authentication successful."
      });
    });

    const serverStatusUnsubscribe = whatsAppService.on('serverStatus', (status) => {
      setServerStatus(status);
      if (status.nodeServer && status.pythonServer) {
        toast({
          title: "Servers Started",
          description: "WhatsApp bot servers are now running."
        });
        handleConnect();
      }
    });

    // Connect to WebSocket server
    whatsAppService.connect();

    // Cleanup listeners on component unmount
    return () => {
      qrUnsubscribe();
      statusUnsubscribe();
      authUnsubscribe();
      serverStatusUnsubscribe();
    };
  }, [onConnect, toast]);

  const startServers = async () => {
    setStartingServers(true);
    try {
      const status = await whatsAppService.startServers();
      setServerStatus(status);
      if (status.nodeServer && status.pythonServer) {
        toast({
          title: "Servers Started",
          description: "WhatsApp bot servers are now running."
        });
        setTimeout(() => {
          handleConnect();
        }, 1000);
      } else {
        setStartingServers(false);
        toast({
          title: "Server Error",
          description: "Could not start all required servers.",
          variant: "destructive"
        });
      }
    } catch (error) {
      setStartingServers(false);
      toast({
        title: "Server Error",
        description: "Failed to start WhatsApp servers.",
        variant: "destructive"
      });
    }
  };

  const handleConnect = () => {
    setConnecting(true);
    setQrCodeUrl(null);
    whatsAppService.initialize();
  };

  const handleRefresh = () => {
    setQrCodeUrl(null);
    handleConnect();
  };

  if (connected) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
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
            onClick={() => {
              whatsAppService.disconnect();
              setConnected(false);
            }}
          >
            Disconnect
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Smartphone className="w-5 h-5 mr-2 text-green-600" />
          Connect WhatsApp
        </CardTitle>
        <CardDescription>
          Start the servers and scan the QR code with WhatsApp on your phone to connect
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {!serverStatus.nodeServer || !serverStatus.pythonServer ? (
          <div className="w-full">
            <div className="mb-4 p-4 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Node.js Server</span>
                <span className={`text-xs px-2 py-1 rounded-full ${serverStatus.nodeServer ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {serverStatus.nodeServer ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Python Server</span>
                <span className={`text-xs px-2 py-1 rounded-full ${serverStatus.pythonServer ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {serverStatus.pythonServer ? 'Running' : 'Stopped'}
                </span>
              </div>
            </div>
            
            <Button 
              onClick={startServers} 
              className="bg-green-600 hover:bg-green-700 w-full"
              disabled={startingServers}
            >
              {startingServers ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting Servers...
                </>
              ) : (
                <>
                  <Server className="w-4 h-4 mr-2" />
                  Start WhatsApp Servers
                </>
              )}
            </Button>
          </div>
        ) : !qrCodeUrl && !connecting ? (
          <Button 
            onClick={handleConnect} 
            className="bg-green-600 hover:bg-green-700"
          >
            Connect to WhatsApp
          </Button>
        ) : null}
        
        {connecting && !qrCodeUrl && serverStatus.nodeServer && serverStatus.pythonServer && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            <p className="mt-4 text-sm text-gray-500">Generating QR code...</p>
          </div>
        )}
        
        {qrCodeUrl && (
          <div className="flex flex-col items-center">
            <div className="border-4 border-green-600 p-2 rounded-lg">
              <img src={qrCodeUrl} alt="WhatsApp QR Code" className="w-48 h-48" />
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Scan this QR code with WhatsApp on your phone
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4 flex items-center space-x-2"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Code</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
