
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { FileDown, FileUp, UserPlus } from "lucide-react";
import { Badge } from "./ui/badge";

export function CandidatesList() {
  const mockCandidates = [
    {
      id: 1,
      name: "John Doe",
      phone: "+91 9876543210",
      company: "ABC Bank",
      experience: 3,
      ctc: 8,
      status: "qualified"
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Candidates</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <FileUp className="w-4 h-4" />
            <span>Import</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>CTC (LPA)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCandidates.length > 0 ? (
                mockCandidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell className="font-medium">{candidate.name}</TableCell>
                    <TableCell>{candidate.phone}</TableCell>
                    <TableCell>{candidate.company}</TableCell>
                    <TableCell>{candidate.experience} years</TableCell>
                    <TableCell>{candidate.ctc}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Qualified
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
        </CardContent>
      </Card>
    </div>
  );
}
