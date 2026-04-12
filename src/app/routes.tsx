import React from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Logbook from "./pages/Logbook";
import LogbookForm from "./pages/LogbookForm";
import LeaveRequest from "./pages/LeaveRequest";
import Documents from "./pages/Documents";
import DraftReport from "./pages/DraftReport";
import MyResearch from "./pages/MyResearch";
import ScrumBoard from "./pages/ScrumBoard";
import Settings from "./pages/Settings";
import OperatorDashboard from "./pages/operator/OperatorDashboard";
import DatabaseMahasiswa from "./pages/operator/DatabaseMahasiswa";
import DatabaseRiset from "./pages/operator/DatabaseRiset";
import DatabaseDosen from "./pages/operator/DatabaseDosen";
import LogbookMonitor from "./pages/operator/LogbookMonitor";
import PersetujuanCuti from "./pages/operator/PersetujuanCuti";
import LayananSurat from "./pages/operator/LayananSurat";
import EksporLaporan from "./pages/operator/EksporLaporan";
import KehadiranMahasiswa from "./pages/operator/KehadiranMahasiswa";
import PengaturanSistem from "./pages/operator/PengaturanSistem";
import AuditLog from "./pages/operator/AuditLog";
import ProgressBoard from "./pages/operator/ProgressBoard";
import SertifikatOperator from "./pages/operator/SertifikatOperator";
import ReviewDraftOperator from "./pages/operator/ReviewDraftOperator";
import PengunduranDiriOperator from "./pages/operator/PengunduranDiriOperator";
import DashboardDosen from "./pages/dosen/DashboardDosen";
import RisetDosen from "./pages/dosen/RisetDosen";
import ReviewLogbook from "./pages/dosen/ReviewLogbook";
import ProgressTim from "./pages/dosen/ProgressTim";
import SertifikatMahasiswa from "./pages/dosen/SertifikatMahasiswa";
import ReviewDraft from "./pages/dosen/ReviewDraft";
import PengajuanDokumenDosen from "./pages/dosen/PengajuanDokumenDosen";
import PengunduranDiriDosen from "./pages/dosen/PengunduranDiriDosen";

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
      { path: "settings", element: <Settings /> },
      { path: "board", element: <Navigate to="/research" replace /> },

      {
        path: "operator",
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="/operator/dashboard" replace /> },
          { path: "dashboard", element: <OperatorDashboard /> },
          { path: "mahasiswa", element: <DatabaseMahasiswa /> },
          { path: "riset", element: <DatabaseRiset /> },
          { path: "dosen", element: <DatabaseDosen /> },
          { path: "logbook", element: <LogbookMonitor /> },
          { path: "kehadiran", element: <KehadiranMahasiswa /> },
          { path: "cuti", element: <PersetujuanCuti /> },
          { path: "pengunduran", element: <PengunduranDiriOperator /> },
          { path: "surat", element: <LayananSurat /> },
          { path: "ekspor", element: <EksporLaporan /> },
          { path: "pengaturan", element: <PengaturanSistem /> },
          { path: "audit", element: <AuditLog /> },
          { path: "progress-board", element: <ProgressBoard /> },
          { path: "draft", element: <ReviewDraftOperator /> },
          { path: "sertifikat", element: <SertifikatOperator /> },
        ],
      },

      {
        path: "dosen",
        element: <Outlet />,
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

      { path: "*", element: <Navigate to="/login" replace /> },
    ],
  },
]);
