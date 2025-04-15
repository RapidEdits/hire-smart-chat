
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { FileDown, FileUp, UserPlus } from "lucide-react";
import { Badge } from "./ui/badge";
import { useToast } from "./ui/use-toast";
import { getQualifiedCandidates, getCandidateStats } from "@/services/candidateService";

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
  const [stats, setStats] = useState({ qualified: 0, total: 0 });
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [candidatesData, statsData] = await Promise.all([
          getQualifiedCandidates(),
          getCandidateStats()
        ]);
        
        setCandidates(candidatesData || []);
        setStats(statsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch candidates",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [toast]);

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

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Qualified Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.qualified}</div>
            <p className="text-xs text-muted-foreground">
              out of {stats.total} total candidates
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Qualification Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.qualified / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average qualification rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Qualified Candidates</CardTitle>
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
