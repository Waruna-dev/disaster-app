import { createContext, useState, useEffect } from "react";
import { adminLogin as adminLoginRequest } from "../api/adminApi";

export const AdminAuthContext = createContext();

// Kept separate from the resident/volunteer AuthContext so this module never
// touches the shared login state used by the rest of the app.
export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const email = localStorage.getItem("adminEmail");
    if (token && email) {
      setAdmin({ token, email });
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await adminLoginRequest(email, password);
    localStorage.setItem("adminToken", data.token);
    localStorage.setItem("adminEmail", data.email);
    setAdmin({ token: data.token, email: data.email });
    return data;
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout, loading }}>
      {!loading && children}
    </AdminAuthContext.Provider>
  );
}
