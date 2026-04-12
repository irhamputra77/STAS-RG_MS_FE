import React from "react";
import { useNavigate, useParams } from "react-router";
import { Layout } from "../components/Layout";
import { SharedBoardView } from "../components/SharedBoardView";

export default function ScrumBoard() {
  const navigate = useNavigate();
  const { researchId } = useParams();

  const projectIds = researchId ? [researchId] : [];

  return (
    <Layout title="Scrum Board">
      <SharedBoardView
        projectIds={projectIds}
        strictProjectFilter={true}
        backLabel="← Kembali ke Riset Saya"
        onBack={() => navigate("/research")}
        accentBg="bg-[#6C47FF]"
        accentText="text-[#6C47FF]"
        accentHover="hover:text-[#6C47FF]"
      />
    </Layout>
  );
}