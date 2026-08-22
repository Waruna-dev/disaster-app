import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AdminAuthContext } from "../context/AdminAuthContext";

export default function ProtectedAdminRoute({ children }) {
  const { admin } = useContext(AdminAuthContext);
  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}
