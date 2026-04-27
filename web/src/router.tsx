import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "@/views/AppShell";
import SignIn from "@/views/SignIn";
import AdminHome from "@/views/admin/AdminHome";
import AgencyHome from "@/views/agency/AgencyHome";
import ClientView from "@/views/client/ClientView";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/agency" replace /> },
      { path: "signin", element: <SignIn /> },
      { path: "admin", element: <AdminHome /> },
      { path: "agency", element: <AgencyHome /> },
      { path: "agency/clients/:slug", element: <ClientView /> },
    ],
  },
]);
