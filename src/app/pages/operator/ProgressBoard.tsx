import React from "react";
import { useLocation, useNavigate } from "react-router";
import { OperatorLayout } from "../../components/OperatorLayout";
import { SharedBoardView } from "../../components/SharedBoardView";

export default function ProgressBoard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get projectIds from navigation state (passed from DatabaseRiset)
  // Fallback to empty array if accessed directly without state
  const projectIds = (location.state?.projectIds as string[]) || [];

  // If accessed directly without projectIds, redirect to riset page
  if (projectIds.length === 0) {
    return (
      <OperatorLayout title="Progress Board">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-lg font-bold text-muted-foreground">Silakan pilih riset dari Database Riset untuk melihat Progress Board.</p>
          <button
            onClick={() => navigate("/operator/riset")}
            className="px-6 py-3 bg-[#0AB600] hover:bg-[#099800] text-white font-bold rounded-xl transition-colors"
          >
            Kembali ke Database Riset
          </button>
        </div>
      </OperatorLayout>
    );
  }

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
