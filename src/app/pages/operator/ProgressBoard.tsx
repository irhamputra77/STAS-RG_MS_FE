import React from "react";
import { useLocation, useNavigate } from "react-router";
import { OperatorLayout } from "../../components/OperatorLayout";
import { SharedBoardView } from "../../components/SharedBoardView";

export default function ProgressBoard() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get projectIds from navigation state (passed from DatabaseRiset)
  const projectIds = (location.state?.projectIds as string[]) || [];

  return (
    <OperatorLayout title="Progress Board">
      <SharedBoardView
        projectIds={projectIds}
        backLabel="← Kembali ke Database Riset"
        onBack={() => navigate("/operator/riset")}
        accentBg="bg-[#0AB600]"
        accentText="text-[#0AB600]"
        accentHover="hover:text-[#0AB600]"
      />
    </OperatorLayout>
  );
}
