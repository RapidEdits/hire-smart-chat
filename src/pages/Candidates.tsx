
import { CandidatesList } from "@/components/CandidatesList";
import { NavBar } from "@/components/NavBar";

const Candidates = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      <CandidatesList />
    </div>
  );
};

export default Candidates;
