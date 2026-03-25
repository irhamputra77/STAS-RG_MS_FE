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
import Settings from "./pages/Settings";
import OperatorDashboard from "./pages/operator/OperatorDashboard";
import DatabaseMahasiswa from "./pages/operator/DatabaseMahasiswa";
import DatabaseRisetDosen from "./pages/operator/DatabaseRisetDosen";
import LogbookMonitor from "./pages/operator/LogbookMonitor";
import PersetujuanCuti from "./pages/operator/PersetujuanCuti";
import LayananSurat from "./pages/operator/LayananSurat";
import EksporLaporan from "./pages/operator/EksporLaporan";
import PengaturanSistem from "./pages/operator/PengaturanSistem";
import AuditLog from "./pages/operator/AuditLog";
import ProgressBoard from "./pages/operator/ProgressBoard";
import SertifikatOperator from "./pages/operator/SertifikatOperator";
import DashboardDosen from "./pages/dosen/DashboardDosen";
import RisetDosen from "./pages/dosen/RisetDosen";
import ReviewLogbook from "./pages/dosen/ReviewLogbook";
import ProgressTim from "./pages/dosen/ProgressTim";
import SertifikatMahasiswa from "./pages/dosen/SertifikatMahasiswa";
import ReviewDraft from "./pages/dosen/ReviewDraft";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Outlet />,
    errorElement: <div className="flex items-center justify-center h-screen text-muted-foreground">Halaman tidak ditemukan.</div>,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: "login",       element: <Login /> },
      { path: "dashboard",   element: <Dashboard /> },
      { path: "attendance",  element: <Attendance /> },
      { path: "logbook",     element: <Logbook /> },
      { path: "logbook/new", element: <LogbookForm /> },
      { path: "leave",       element: <LeaveRequest /> },
      { path: "documents",   element: <Documents /> },
      { path: "draft",       element: <DraftReport /> },
      { path: "research",    element: <MyResearch /> },
      { path: "settings",    element: <Settings /> },
      { path: "board",       element: <Navigate to="/research" replace /> },
      {
        path: "operator", element: <Outlet />,
        children: [
          { index: true,          element: <Navigate to="/operator/dashboard" replace /> },
          { path: "dashboard",    element: <OperatorDashboard /> },
          { path: "mahasiswa",    element: <DatabaseMahasiswa /> },
          { path: "riset-dosen",  element: <DatabaseRisetDosen /> },
          { path: "logbook",      element: <LogbookMonitor /> },
          { path: "cuti",         element: <PersetujuanCuti /> },
          { path: "surat",        element: <LayananSurat /> },
          { path: "ekspor",       element: <EksporLaporan /> },
          { path: "pengaturan",   element: <PengaturanSistem /> },
          { path: "audit",        element: <AuditLog /> },
          { path: "progress-board", element: <ProgressBoard /> },
          { path: "sertifikat",   element: <SertifikatOperator /> },
        ],
      },
      {
        path: "dosen", element: <Outlet />,
        children: [
          { index: true,          element: <Navigate to="/dosen/dashboard" replace /> },
          { path: "dashboard",    element: <DashboardDosen /> },
          { path: "riset",        element: <RisetDosen /> },
          { path: "logbook",      element: <ReviewLogbook /> },
          { path: "draft",        element: <ReviewDraft /> },
          { path: "progress",     element: <ProgressTim /> },
          { path: "sertifikat",   element: <SertifikatMahasiswa /> },
        ],
      },
      { path: "*", element: <Navigate to="/login" replace /> },
    ],
  },
]);
