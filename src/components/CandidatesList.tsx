
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { FileDown, FileUp, UserPlus } from "lucide-react";
import { Badge } from "./ui/badge";
import axios from "axios";
import { useToast } from "./ui/use-toast";

type Candidate = {
  id: number;
  name: string;
  phone: string;
  company: string;
  experience: string;
  ctc: string;
  product?: string;
  notice?: string;
  qualified: boolean;
  interview_scheduled: boolean;
  date_added?: string;
};

export function CandidatesList() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:5000/candidates');
        setCandidates(response.data || []);
      } catch (error) {
        console.error('Error fetching candidates:', error);
        
        // If in development/preview mode, use mock data
        if (import.meta.env.DEV || window.location.hostname.includes('lovableproject.com')) {
          console.log('Using mock candidate data');
          setCandidates([
            {
              id: 1,
              name: "John Doe",
              phone: "916200083509",
              company: "HDFC Bank",
              experience: "3 years",
              ctc: "8 LPA",
              product: "Home Loan",
              notice: "30 days",
              qualified: true,
              interview_scheduled: true
            },
            {
              id: 2,
              name: "Jane Smith",
              phone: "919987257230",
              company: "ICICI Bank",
              experience: "2 years",
              ctc: "6 LPA",
              product: "Personal Loan",
              notice: "45 days",
              qualified: false,
              interview_scheduled: false
            }
          ]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchCandidates();
  }, []);

  const handleExport = () => {
    if (candidates.length === 0) return;
    
    // Convert candidates to CSV
    const headers = "ID,Name,Phone,Company,Experience,CTC,Product,Notice Period,Qualified,Interview Scheduled,Date Added\n";
    const rows = candidates.map(candidate => 
      `${candidate.id},"${candidate.name || candidate.company}",${candidate.phone},"${candidate.company}","${candidate.experience}","${candidate.ctc}","${candidate.product || ""}","${candidate.notice || ""}",${candidate.qualified},${candidate.interview_scheduled},"${candidate.date_added || ""}"`
    ).join('\n');
    
    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidates.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Candidates Exported",
      description: "The candidates list has been exported to a CSV file",
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Candidates</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <FileUp className="w-4 h-4" />
            <span>Import</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center space-x-2"
            onClick={handleExport}
            disabled={candidates.length === 0}
          >
            <FileDown className="w-4 h-4" />
            <span>Export</span>
          </Button>
          <Button size="sm" className="flex items-center space-x-2 bg-whatsapp hover:bg-whatsapp-dark">
            <UserPlus className="w-4 h-4" />
            <span>Add Candidate</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Candidate Database</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name/Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>CTC (LPA)</TableHead>
                  <TableHead>Notice Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.length > 0 ? (
                  candidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell className="font-medium">{candidate.name || candidate.company}</TableCell>
                      <TableCell>{candidate.phone}</TableCell>
                      <TableCell>{candidate.experience}</TableCell>
                      <TableCell>{candidate.ctc}</TableCell>
                      <TableCell>{candidate.notice || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={candidate.qualified 
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                        }>
                          {candidate.qualified ? 'Qualified' : 'Not Qualified'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">View</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                      No candidates found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
