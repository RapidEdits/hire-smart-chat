
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Loader2, QrCode, RefreshCw, Smartphone, Server, AlertTriangle } from "lucide-react";
import { whatsAppService } from "@/services/whatsappService";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

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
  const [startAttempted, setStartAttempted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPreviewMode] = useState(whatsAppService.isInPreviewMode());
  const [startServerClickCount, setStartServerClickCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Check initial connection status
    whatsAppService.getStatus().catch(() => {
      // If we can't connect to the server, assume it's not running
      setServerStatus({ nodeServer: false, pythonServer: false });
    }).then((status) => {
      if (status?.isConnected) {
        setConnected(true);
        onConnect();
      }
    });

    // Check initial server status
    whatsAppService.getServerStatus().catch(() => {
      // If we can't get the status, assume servers are down
      setServerStatus({ nodeServer: false, pythonServer: false });
    }).then((status) => {
      if (status) {
        setServerStatus(status);
      }
    });

    // Set up WebSocket listeners
    const qrUnsubscribe = whatsAppService.on('qrCode', (data: { qrDataURL: string }) => {
      setQrCodeUrl(data.qrDataURL);
      setStartingServers(false);
      setErrorMessage(null);
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
      console.log("Server status update:", status);
      setServerStatus(status);
      setStartingServers(false);
      
      if (status.nodeServer && status.pythonServer) {
        toast({
          title: "Servers Started",
          description: "WhatsApp bot servers are now running."
        });
        
        if (startAttempted) {
          setTimeout(() => {
            handleConnect();
          }, 1000);
        }
      } else if (startAttempted) {
        // If we attempted to start the servers but they're not both running
        if (status.nodeServer && !status.pythonServer) {
          setErrorMessage("Python server failed to start. Please check your Python installation.");
        } else if (!status.nodeServer) {
          setErrorMessage("Node.js server is not running. Please start the server with 'node server.js'.");
        } else {
          setErrorMessage("Server startup failed. Please check your installation.");
        }
      }
    });
    
    const errorUnsubscribe = whatsAppService.on('error', (error: { message: string }) => {
      console.error("Error from WhatsApp service:", error.message);
      setErrorMessage(error.message);
      setStartingServers(false);
      
      toast({
        title: "Connection Error",
        description: error.message,
        variant: "destructive"
      });
    });

    // Connect to WebSocket server (but don't crash if it fails)
    whatsAppService.connect();

    // Cleanup listeners on component unmount
    return () => {
      qrUnsubscribe();
      statusUnsubscribe();
      authUnsubscribe();
      serverStatusUnsubscribe();
      errorUnsubscribe();
    };
  }, [onConnect, toast, startAttempted]);

  const startServers = async () => {
    setStartingServers(true);
    setStartAttempted(true);
    setErrorMessage(null);
    setStartServerClickCount(prev => prev + 1);
    
    // Provide specific guidance after multiple attempts
    if (startServerClickCount >= 2) {
      toast({
        title: "Troubleshooting Tip",
        description: "If server won't start, try running the 'startBot.bat' file directly from your project folder."
      });
    }
    
    try {
      console.log("Starting WhatsApp servers...");
      
      if (isPreviewMode) {
        // In preview mode, just simulate the process
        await whatsAppService.startServers();
      } else {
        // In local mode, try to launch the batch file
        try {
          // Try to launch the batch file - this will work when running locally
          const startProcess = window.open('file:///' + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/startBot.bat');
          
          if (startProcess) {
            setTimeout(() => {
              startProcess.close();
            }, 1000);
          }
        } catch (error) {
          console.error("Error launching batch file:", error);
          // Fallback to the old method
          await whatsAppService.startServers();
        }
      }
      
      toast({
        title: "Starting Servers",
        description: "Attempting to start WhatsApp bot servers..."
      });
      
    } catch (error) {
      console.error('Error starting servers:', error);
      setStartingServers(false);
      
      if (!errorMessage) {
        setErrorMessage("Failed to start the servers. Please run 'startBot.bat' file manually from your project folder.");
      }
      
      toast({
        title: "Server Error",
        description: "Could not start the servers automatically. Please run startBot.bat manually.",
        variant: "destructive"
      });
    }
  };

  const handleConnect = () => {
    setConnecting(true);
    setQrCodeUrl(null);
    setErrorMessage(null);
    whatsAppService.initialize();
  };

  const handleRefresh = () => {
    setQrCodeUrl(null);
    setErrorMessage(null);
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
          {isPreviewMode 
            ? "This feature requires a local WhatsApp server"
            : "Start the servers and scan the QR code with WhatsApp on your phone to connect"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {isPreviewMode && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Preview Mode Detected</AlertTitle>
            <AlertDescription>
              This application requires a local WhatsApp server to function. 
              Please download and run this application locally on your machine.
            </AlertDescription>
          </Alert>
        )}
        
        {errorMessage && !isPreviewMode && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      
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
            
            {!serverStatus.nodeServer && (
              <Alert className="mb-4 bg-blue-50 border-blue-200 text-blue-800">
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Make sure the Node.js server is running. Open a terminal in your project directory and run:
                  <code className="block mt-2 p-2 bg-gray-800 text-white rounded font-mono text-sm">
                    node server.js
                  </code>
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={startServers} 
              className="bg-green-600 hover:bg-green-700 w-full"
              disabled={startingServers || isPreviewMode}
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
            disabled={isPreviewMode}
          >
            Connect to WhatsApp
          </Button>
        ) : null}
        
        {connecting && !qrCodeUrl && serverStatus.nodeServer && serverStatus.pythonServer && !errorMessage && (
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
