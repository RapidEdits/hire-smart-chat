
import { MessageSquare, Settings, Users, Bot, ListFilter } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

export function NavBar() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between px-8 py-4 bg-white border-b">
      <div className="flex items-center space-x-2">
        <MessageSquare className="w-6 h-6 text-whatsapp" />
        <h1 className="text-xl font-bold">HireSmart Chat</h1>
      </div>
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center space-x-2"
          onClick={() => navigate("/")}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Dashboard</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center space-x-2"
          onClick={() => navigate("/candidates")}
        >
          <Users className="w-4 h-4" />
          <span>Candidates</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center space-x-2"
          onClick={() => navigate("/whatsapp-bot")}
        >
          <Bot className="w-4 h-4" />
          <span>WhatsApp Bot</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center space-x-2"
          onClick={() => navigate("/bot-logs")}
        >
          <ListFilter className="w-4 h-4" />
          <span>Bot Logs</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center space-x-2"
          onClick={() => navigate("/settings")}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Button>
      </div>
    </div>
  );
}
