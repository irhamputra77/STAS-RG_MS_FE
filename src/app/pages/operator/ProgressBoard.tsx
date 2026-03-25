import React from "react";
import { OperatorLayout } from "../../components/OperatorLayout";
import { SharedBoardView } from "../../components/SharedBoardView";
import { apiGet } from "../../lib/api";

export default function ProgressBoard() {
  const [projectIds, setProjectIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const loadProjects = async () => {
      try {
        const rows = await apiGet<Array<any>>(`/research`);
        setProjectIds(rows.map((item) => item.id));
      } catch {
      }
    };

    loadProjects();
  }, []);

  return (
    <OperatorLayout title="Progress Board">
      <SharedBoardView
        projectIds={projectIds}
        accentBg="bg-[#6C47FF]"
        accentText="text-[#6C47FF]"
        accentHover="hover:text-[#6C47FF]"
      />
    </OperatorLayout>
  );
}
