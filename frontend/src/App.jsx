import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import ResidentDashboard from "./components/ResidentDashboard.jsx";
import VolunteerDashboard from "./components/VolunteerDashboard.jsx";
import SubmitReport from "./components/SubmitReport.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Profile from "./pages/Profile.jsx";

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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
