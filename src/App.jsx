import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Impressum from '@/pages/Impressum';
import Datenschutz from '@/pages/Datenschutz';
import Agb from '@/pages/Agb';
import Haftungsausschluss from '@/pages/Haftungsausschluss';
import Barrierefreiheit from '@/pages/Barrierefreiheit';
import Browse from '@/pages/Browse';
import PresentationDetail from '@/pages/PresentationDetail';
import Upload from '@/pages/Upload';
import Profile from '@/pages/Profile';
import PublicProfile from '@/pages/PublicProfile';
import { LanguageProvider } from '@/lib/LanguageContext';
import RouteA11y from '@/components/a11y/RouteA11y';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#FDFDFD]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#2563EB] rounded-full animate-spin" />
          <p role="status" className="text-sm text-slate-600 font-body">PaperHub wird geladen…</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return <Navigate to="/login" replace />;
    }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/browse" replace />} />

        <Route path="/browse" element={<Browse />} />
        <Route path="/presentation/:id" element={<PresentationDetail />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/u/:identifier" element={<PublicProfile />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <RouteA11y />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/landing" element={<Navigate to="/" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/impressum" element={<Impressum />} />
              <Route path="/datenschutz" element={<Datenschutz />} />
              <Route path="/agb" element={<Agb />} />
              <Route path="/haftungsausschluss" element={<Haftungsausschluss />} />
              <Route path="/barrierefreiheit" element={<Barrierefreiheit />} />
              <Route path="*" element={<AuthenticatedApp />} />
            </Routes>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App