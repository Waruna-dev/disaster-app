import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import ResidentDashboard from "./components/ResidentDashboard.jsx";
import VolunteerDashboard from "./components/VolunteerDashboard.jsx";
import SubmitReport from "./components/SubmitReport.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Profile from "./pages/Profile.jsx";

// Admin dashboard module (isolated from the resident/volunteer app above).
import { AdminAuthProvider } from "./admin/context/AdminAuthContext.jsx";
import ProtectedAdminRoute from "./admin/components/ProtectedAdminRoute.jsx";
import AdminLayout from "./admin/components/AdminLayout.jsx";
import AdminLogin from "./admin/pages/AdminLogin.jsx";
import SummaryDashboard from "./admin/pages/SummaryDashboard.jsx";
import PendingReports from "./admin/pages/PendingReports.jsx";
import CreateAnnouncements from "./admin/pages/CreateAnnouncements.jsx";
import ComingSoon from "./admin/pages/ComingSoon.jsx";

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<ResidentDashboard />} />
          <Route path="/volunteer-dashboard" element={<VolunteerDashboard />} />
          <Route path="/report" element={<SubmitReport />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />

          {/* Admin dashboard */}
          <Route
            path="/admin/*"
            element={
              <AdminAuthProvider>
                <Routes>
                  <Route path="login" element={<AdminLogin />} />
                  <Route
                    element={
                      <ProtectedAdminRoute>
                        <AdminLayout />
                      </ProtectedAdminRoute>
                    }
                  >
                    <Route index element={<SummaryDashboard />} />
                    <Route path="summary" element={<SummaryDashboard />} />
                    <Route path="pending-reports" element={<PendingReports />} />
                    <Route path="announcements" element={<CreateAnnouncements />} />
                    <Route path="disaster-map" element={<ComingSoon title="Disaster Monitoring Map" icon="map" />} />
                    <Route path="volunteer-management" element={<ComingSoon title="Volunteer Management" icon="groups" />} />
                    <Route path="volunteer-tasks" element={<ComingSoon title="Volunteer Task Management" icon="assignment_ind" />} />
                  </Route>
                </Routes>
              </AdminAuthProvider>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
