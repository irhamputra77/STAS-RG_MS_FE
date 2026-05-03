import React from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { useAuth } from "./context/AuthContext";
import type { UserRole } from "./context/AuthContext";
import Login from "./components/pages/Login";
import Dashboard from "./components/pages/mahasiswa/Dashboard";
import Attendance from "./components/pages/mahasiswa/Attendance";
import Logbook from "./components/pages/mahasiswa/Logbook";
import LogbookForm from "./components/pages/mahasiswa/LogbookForm";
import LeaveRequest from "./components/pages/mahasiswa/LeaveRequest";
import Documents from "./components/pages/mahasiswa/Documents";
import DraftReport from "./components/pages/mahasiswa/DraftReport";
import MyResearch from "./components/pages/mahasiswa/MyResearch";
import ScrumBoard from "./components/pages/mahasiswa/ScrumBoard";
import Settings from "./components/pages/Settings";
import OperatorDashboard from "./components/pages/operator/OperatorDashboard";
import DatabaseMahasiswa from "./components/pages/operator/DatabaseMahasiswa";
import DatabaseRiset from "./components/pages/operator/DatabaseRiset";
import DatabaseDosen from "./components/pages/operator/DatabaseDosen";
import DatabaseOperator from "./components/pages/operator/DatabaseOperator";
import LogbookMonitor from "./components/pages/operator/LogbookMonitor";
import PersetujuanCuti from "./components/pages/operator/PersetujuanCuti";
import LayananSurat from "./components/pages/operator/LayananSurat";
import EksporLaporan from "./components/pages/operator/EksporLaporan";
import KehadiranMahasiswa from "./components/pages/operator/KehadiranMahasiswa";
import PengaturanWfhMahasiswa from "./components/pages/operator/PengaturanWfhMahasiswa";
import PengaturanSistem from "./components/pages/operator/PengaturanSistem";
import AuditLog from "./components/pages/operator/AuditLog";
import ProgressBoard from "./components/pages/operator/ProgressBoard";
import SertifikatOperator from "./components/pages/operator/SertifikatOperator";
import ReviewDraftOperator from "./components/pages/operator/ReviewDraftOperator";
import PengunduranDiriOperator from "./components/pages/operator/PengunduranDiriOperator";
import DashboardDosen from "./components/pages/dosen/DashboardDosen";
import RisetDosen from "./components/pages/dosen/RisetDosen";
import ReviewLogbook from "./components/pages/dosen/ReviewLogbook";
import ProgressTim from "./components/pages/dosen/ProgressTim";
import SertifikatMahasiswa from "./components/pages/dosen/SertifikatMahasiswa";
import ReviewDraft from "./components/pages/dosen/ReviewDraft";
import PengajuanDokumenDosen from "./components/pages/dosen/PengajuanDokumenDosen";
import PengunduranDiriDosen from "./components/pages/dosen/PengunduranDiriDosen";

const ROLE_HOME: Record<UserRole, string> = {
  mahasiswa: "/dashboard",
  operator: "/operator/dashboard",
  dosen: "/dosen/dashboard"
};

function RequireAuth() {
  const { user, hydrated } = useAuth();

  if (!hydrated) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Memeriksa sesi...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function RequireRole({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { user, hydrated } = useAuth();

  if (!hydrated) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Memeriksa sesi...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] || "/dashboard"} replace />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Outlet />,
    errorElement: (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Halaman tidak ditemukan.
      </div>
    ),
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: "login", element: <Login /> },
      {
        element: <Outlet />,
        children: [
          {
            element: <RequireAuth />,
            children: [
              { path: "settings", element: <Settings /> },
              {
                element: <RequireRole allowedRoles={["mahasiswa"]} />,
                children: [
                  { path: "dashboard", element: <Dashboard /> },
                  { path: "attendance", element: <Attendance /> },
                  { path: "logbook", element: <Logbook /> },
                  { path: "logbook/new", element: <LogbookForm /> },
                  { path: "leave", element: <LeaveRequest /> },
                  { path: "documents", element: <Documents /> },
                  { path: "draft", element: <DraftReport /> },
                  { path: "research", element: <MyResearch /> },
                  { path: "scrum-board", element: <Navigate to="/research" replace /> },
                  { path: "scrum-board/:researchId", element: <ScrumBoard /> },
                  { path: "board", element: <Navigate to="/research" replace /> },
                ],
              },
            ]
          },
          {
            path: "operator",
            element: <RequireRole allowedRoles={["operator"]} />,
            children: [
              { index: true, element: <Navigate to="/operator/dashboard" replace /> },
              { path: "dashboard", element: <OperatorDashboard /> },
              { path: "mahasiswa", element: <DatabaseMahasiswa /> },
              { path: "riset", element: <DatabaseRiset /> },
              { path: "dosen", element: <DatabaseDosen /> },
              { path: "operator", element: <DatabaseOperator /> },
              { path: "wfh-mahasiswa", element: <PengaturanWfhMahasiswa /> },
              { path: "logbook", element: <LogbookMonitor /> },
              { path: "kehadiran", element: <KehadiranMahasiswa /> },
              { path: "cuti", element: <PersetujuanCuti /> },
              { path: "pengunduran", element: <PengunduranDiriOperator /> },
              { path: "surat", element: <LayananSurat /> },
              { path: "ekspor", element: <EksporLaporan /> },
              { path: "pengaturan", element: <PengaturanSistem /> },
              { path: "audit", element: <AuditLog /> },
              { path: "progress-board", element: <ProgressBoard /> },
              { path: "progress-board/:researchId", element: <ProgressBoard /> },
              { path: "progress-board/*", element: <ProgressBoard /> },
              { path: "draft", element: <ReviewDraftOperator /> },
              { path: "sertifikat", element: <SertifikatOperator /> },
            ],
          },

          {
            path: "dosen",
            element: <RequireRole allowedRoles={["dosen"]} />,
            children: [
              { index: true, element: <Navigate to="/dosen/dashboard" replace /> },
              { path: "dashboard", element: <DashboardDosen /> },
              { path: "riset", element: <RisetDosen /> },
              { path: "logbook", element: <ReviewLogbook /> },
              { path: "draft", element: <ReviewDraft /> },
              { path: "progress", element: <ProgressTim /> },
              { path: "pengunduran", element: <PengunduranDiriDosen /> },
              { path: "surat", element: <PengajuanDokumenDosen /> },
              { path: "sertifikat", element: <SertifikatMahasiswa /> },
            ],
          },
        ],
      },

      { path: "*", element: <Navigate to="/login" replace /> },
    ],
  },
]);
