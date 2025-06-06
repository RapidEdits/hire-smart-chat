
import { Dashboard } from "@/components/Dashboard";
import { NavBar } from "@/components/NavBar";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      <Dashboard />
    </div>
  );
};

export default Index;
