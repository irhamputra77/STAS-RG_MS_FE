import React from "react";
import { DosenLayout } from "../../components/DosenLayout";
import { SharedBoardView } from "../../components/SharedBoardView";
import { apiGet, getStoredUser } from "../../lib/api";

export default function ProgressTim() {
  const user = getStoredUser();
  const [projectIds, setProjectIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const loadAssigned = async () => {
      if (!user?.id) return;
      try {
        const rows = await apiGet<Array<any>>(`/research/assigned?userId=${encodeURIComponent(user.id)}`);
        if (rows.length > 0) {
          setProjectIds(rows.map((item) => item.id));
        }
      } catch {
      }
    };

    loadAssigned();
  }, [user?.id]);

  return (
    <DosenLayout title="Progress Board">
      <SharedBoardView
        projectIds={projectIds}
        strictProjectFilter
        accentBg="bg-[#6C47FF]"
        accentText="text-[#6C47FF]"
        accentHover="hover:text-[#6C47FF]"
      />
    </DosenLayout>
  );
}
