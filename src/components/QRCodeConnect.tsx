
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Loader2, QrCode, RefreshCw, Smartphone } from "lucide-react";

type QRCodeConnectProps = {
  onConnect: () => void;
};

export function QRCodeConnect({ onConnect }: QRCodeConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const handleConnect = () => {
    setConnecting(true);
    // Simulate QR code loading
    setTimeout(() => {
      setQrCodeUrl("https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=SampleWhatsAppQRCode");
      
      // Simulate connection after 5 seconds
      setTimeout(() => {
        setConnecting(false);
        onConnect();
      }, 5000);
    }, 2000);
  };

  const handleRefresh = () => {
    setQrCodeUrl(null);
    handleConnect();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Smartphone className="w-5 h-5 mr-2 text-whatsapp" />
          Connect WhatsApp
        </CardTitle>
        <CardDescription>
          Scan the QR code with WhatsApp on your phone to connect to the chatbot
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {!qrCodeUrl && !connecting && (
          <Button 
            onClick={handleConnect} 
            className="bg-whatsapp hover:bg-whatsapp-dark"
          >
            Connect to WhatsApp
          </Button>
        )}
        
        {connecting && !qrCodeUrl && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-whatsapp" />
            <p className="mt-4 text-sm text-gray-500">Generating QR code...</p>
          </div>
        )}
        
        {qrCodeUrl && (
          <div className="flex flex-col items-center">
            <div className="border-4 border-whatsapp p-2 rounded-lg">
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
