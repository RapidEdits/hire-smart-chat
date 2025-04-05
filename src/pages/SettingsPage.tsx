
import { NavBar } from "@/components/NavBar";
import { Settings } from "@/components/Settings";

const SettingsPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      <Settings />
    </div>
  );
};

export default SettingsPage;
