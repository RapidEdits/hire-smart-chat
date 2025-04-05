
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Save, Edit, Trash, Plus } from "lucide-react";
import { useToast } from "./ui/use-toast";

type FlowStep = {
  step: string;
  match: string;
  ask: string;
  editing?: boolean;
};

export function ConversationFlow() {
  const [flow, setFlow] = useState<FlowStep[]>([
    { step: "interest", match: "yes|ya|sure|interested|haan|haanji|ok|haa|S", ask: "" },
    { step: "company", match: "", ask: "Currently in which company are you working?" },
    { step: "notice", match: "", ask: "Ok and your notice period?" },
    { step: "ctc", match: "", ask: "Ok, What's your current CTC?" },
    { step: "product", match: "", ask: "Ok, Which product are you currently handling?" },
    { step: "experience", match: "", ask: "How many years of experience in this product?" },
    { step: "cv", match: "", ask: "Kindly forward me your CV." }
  ]);
  
  const [newStep, setNewStep] = useState<FlowStep>({ step: "", match: "", ask: "" });
  const [addingNew, setAddingNew] = useState(false);
  const { toast } = useToast();

  const handleEdit = (index: number) => {
    const newFlow = [...flow];
    newFlow[index] = { ...newFlow[index], editing: true };
    setFlow(newFlow);
  };

  const handleSave = (index: number) => {
    const newFlow = [...flow];
    newFlow[index] = { ...newFlow[index], editing: false };
    setFlow(newFlow);
    
    toast({
      title: "Step updated",
      description: `Conversation step "${newFlow[index].step}" has been updated.`,
    });
  };

  const handleDelete = (index: number) => {
    const stepName = flow[index].step;
    const newFlow = flow.filter((_, i) => i !== index);
    setFlow(newFlow);
    
    toast({
      title: "Step deleted",
      description: `Conversation step "${stepName}" has been removed.`,
    });
  };

  const handleChange = (index: number, field: keyof FlowStep, value: string) => {
    const newFlow = [...flow];
    newFlow[index] = { ...newFlow[index], [field]: value };
    setFlow(newFlow);
  };

  const handleAddNew = () => {
    if (!newStep.step.trim() || !newStep.ask.trim()) {
      toast({
        title: "Error",
        description: "Step name and question are required",
        variant: "destructive"
      });
      return;
    }

    setFlow([...flow, { ...newStep }]);
    setNewStep({ step: "", match: "", ask: "" });
    setAddingNew(false);

    toast({
      title: "Step added",
      description: `New conversation step "${newStep.step}" has been added.`,
    });
  };

  const exportFlow = () => {
    // In a real app, this would make an API call to save the flow
    const csvContent = "step,match,ask\n" + 
      flow.map(row => 
        `${row.step},"${row.match}","${row.ask}"`
      ).join("\n");
    
    // Create a downloadable file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conversation_flow.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Flow exported",
      description: "Conversation flow has been exported as CSV.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Conversation Flow</span>
          <Button size="sm" variant="outline" onClick={exportFlow}>
            Export CSV
          </Button>
        </CardTitle>
        <CardDescription>
          Define the steps and questions for the hiring conversation flow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Step</TableHead>
              <TableHead className="w-[200px]">Match Words</TableHead>
              <TableHead>Question</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flow.map((step, index) => (
              <TableRow key={index}>
                <TableCell>
                  {step.editing ? (
                    <Input 
                      value={step.step} 
                      onChange={(e) => handleChange(index, 'step', e.target.value)}
                    />
                  ) : step.step}
                </TableCell>
                <TableCell>
                  {step.editing ? (
                    <Input 
                      value={step.match} 
                      onChange={(e) => handleChange(index, 'match', e.target.value)}
                      placeholder="Optional match pattern"
                    />
                  ) : step.match || "-"}
                </TableCell>
                <TableCell>
                  {step.editing ? (
                    <Textarea 
                      value={step.ask} 
                      onChange={(e) => handleChange(index, 'ask', e.target.value)}
                      rows={2}
                    />
                  ) : step.ask}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    {step.editing ? (
                      <Button size="icon" variant="ghost" onClick={() => handleSave(index)}>
                        <Save className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(index)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(index)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            
            {addingNew && (
              <TableRow>
                <TableCell>
                  <Input 
                    value={newStep.step} 
                    onChange={(e) => setNewStep({...newStep, step: e.target.value})}
                    placeholder="Step name"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    value={newStep.match} 
                    onChange={(e) => setNewStep({...newStep, match: e.target.value})}
                    placeholder="Optional match pattern"
                  />
                </TableCell>
                <TableCell>
                  <Textarea 
                    value={newStep.ask} 
                    onChange={(e) => setNewStep({...newStep, ask: e.target.value})}
                    placeholder="Question text"
                    rows={2}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    <Button size="icon" variant="ghost" onClick={handleAddNew}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setAddingNew(false)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {!addingNew && (
          <Button 
            className="mt-4"
            variant="outline"
            onClick={() => setAddingNew(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Step
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
