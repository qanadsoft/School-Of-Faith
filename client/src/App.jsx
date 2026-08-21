import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import MemberPage from "./pages/MemberPage";
import AdminPage from "./pages/AdminPage";
import WatchPage from "./pages/WatchPage";
import CategoryPage from "./pages/CategoryPage";
import VideoPlayerPage from "./pages/VideoPlayerPage";
import { useAuth } from "./state/auth-context";

function ProtectedRoute({ children, role }) {
  const { user, token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role && !user?.roles?.includes(role)) {
    return <Navigate to={user?.roles?.includes("member") ? "/member" : "/login"} replace />;
  }

  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/member"
        element={
          <ProtectedRoute role="member">
            <MemberPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route path="/watch" element={<ProtectedRoute role="member"><WatchPage /></ProtectedRoute>} />
      <Route path="/watch/topic/:slug" element={<ProtectedRoute role="member"><CategoryPage /></ProtectedRoute>} />
      <Route path="/watch/video/:id" element={<ProtectedRoute role="member"><VideoPlayerPage /></ProtectedRoute>} />
      <Route
        path="*"
        element={<Navigate to={user?.roles?.includes("admin") ? "/admin" : "/member"} replace />}
      />
    </Routes>
  );
}
