
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Upload, Trash, FileText, Play } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "./ui/use-toast";

export function NumbersUpload() {
  const [numbers, setNumbers] = useState<string[]>([]);
  const [numberText, setNumberText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    // Simulate file processing
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
        setNumbers(lines);
        setIsUploading(false);
        
        toast({
          title: "Numbers uploaded",
          description: `Successfully loaded ${lines.length} phone numbers.`,
        });
      };
      reader.readAsText(file);
    }, 500);
  };

  const handlePasteNumbers = () => {
    if (!numberText.trim()) {
      toast({
        title: "No numbers found",
        description: "Please enter phone numbers first.",
        variant: "destructive"
      });
      return;
    }
    
    const lines = numberText.split(/\r?\n/).filter(line => line.trim().length > 0);
    setNumbers(lines);
    setNumberText("");
    
    toast({
      title: "Numbers processed",
      description: `Successfully added ${lines.length} phone numbers.`,
    });
  };

  const handleClearNumbers = () => {
    setNumbers([]);
    
    toast({
      title: "Numbers cleared",
      description: "All phone numbers have been removed.",
    });
  };

  const handleStartCampaign = () => {
    if (numbers.length === 0) {
      toast({
        title: "No numbers available",
        description: "Please upload numbers before starting the campaign.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Campaign started",
      description: `Starting campaign with ${numbers.length} numbers.`,
    });
    
    // In a real app, this would start the WhatsApp messaging campaign
    console.log("Starting campaign with numbers:", numbers);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phone Numbers</CardTitle>
        <CardDescription>
          Manage phone numbers for the WhatsApp campaign
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="upload">File Upload</TabsTrigger>
            <TabsTrigger value="paste">Paste Numbers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload">
            <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center">
              <FileText className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 mb-4">
                Upload a text file with one phone number per line
              </p>
              <Input
                type="file"
                accept=".txt,.csv"
                className="hidden"
                id="file-upload"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById("file-upload")?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Numbers
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="paste">
            <div className="space-y-4">
              <Textarea
                placeholder="Enter phone numbers with country code (one per line)"
                rows={6}
                value={numberText}
                onChange={(e) => setNumberText(e.target.value)}
              />
              <Button variant="outline" onClick={handlePasteNumbers}>
                Process Numbers
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Processed Numbers ({numbers.length})</h3>
            {numbers.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearNumbers}>
                <Trash className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          
          {numbers.length === 0 ? (
            <div className="text-center py-8 border rounded-md text-gray-500">
              No numbers uploaded yet
            </div>
          ) : (
            <div className="border rounded-md h-48 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Phone Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {numbers.map((number, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{number}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
      {numbers.length > 0 && (
        <CardFooter className="flex justify-end pt-2">
          <Button className="bg-whatsapp hover:bg-whatsapp-dark" onClick={handleStartCampaign}>
            <Play className="h-4 w-4 mr-2" />
            Start Campaign
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
