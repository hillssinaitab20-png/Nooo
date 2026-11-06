/**
 * ACCOUNT COMMAND CENTER
 * Private Administrator Console for Authorized Personal Google Accounts
 */

import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './context/ToastContext.tsx';
import { ModeProvider, useMode } from './context/ModeContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AccountProvider, useAccount } from './context/AccountContext.tsx';
import { Header } from './components/layout/Header.tsx';
import { Sidebar, NavigationTab } from './components/layout/Sidebar.tsx';
import { LoginScreen } from './components/auth/LoginScreen.tsx';
import { AccessDeniedScreen } from './components/auth/AccessDeniedScreen.tsx';
import { SessionExpiredScreen } from './components/auth/SessionExpiredScreen.tsx';
import { SetupGuideModal } from './components/modals/SetupGuideModal.tsx';
import { TakeoutImportModal } from './components/modals/TakeoutImportModal.tsx';
import { OverviewPage } from './pages/OverviewPage.tsx';
import { AccountsPage } from './pages/AccountsPage.tsx';
import { GmailPage } from './pages/GmailPage.tsx';
import { YouTubeHistoryPage } from './pages/YouTubeHistoryPage.tsx';
import { SearchHistoryPage } from './pages/SearchHistoryPage.tsx';
import { ActivityLogsPage } from './pages/ActivityLogsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { Loader2 } from 'lucide-react';

function CommandCenterContent() {
  const { user, isAuthorized, isLoading, accessDenied, sessionExpired } = useAuth();
  const { startAddAccountFlow, refreshAccounts } = useAccount();
  const { success, error: toastError, warning } = useToast();

  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [setupGuideOpen, setSetupGuideOpen] = useState<boolean>(false);
  const [takeoutModalOpen, setTakeoutModalOpen] = useState<boolean>(false);

  // Check URL query parameters for OAuth results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const email = params.get('email');
    const oauthError = params.get('oauth_error');

    if (connected === 'success') {
      success('Google Account Connected', `Authorized account: ${email || 'Google User'}`);
      refreshAccounts();
      // Clean query params
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthError) {
      toastError('OAuth Authorization Failed', decodeURIComponent(oauthError));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleOpenAddAccount = async () => {
    const result = await startAddAccountFlow();
    if (result.requiresSetup) {
      setSetupGuideOpen(true);
    } else if (result.success && result.url) {
      window.location.href = result.url;
    }
  };

  // State: Loading Initial Auth
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#080D1B] flex flex-col items-center justify-center text-slate-300 font-mono text-xs gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#4D8DFF]" />
        <span>Initializing Zero-Trust Security Perimeter...</span>
      </div>
    );
  }

  // State: Access Denied (Non-admin account attempted login)
  if (accessDenied) {
    return <AccessDeniedScreen />;
  }

  // State: Session Expired
  if (sessionExpired) {
    return <SessionExpiredScreen />;
  }

  // State: Not Logged In
  if (!isAuthorized || !user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#080D1B] text-slate-100 flex flex-col font-sans selection:bg-[#4D8DFF]/30 selection:text-white">
      {/* Top Header */}
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenSetupGuide={() => setSetupGuideOpen(true)}
        onOpenAddAccount={handleOpenAddAccount}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={tab => setCurrentTab(tab)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Page Content Viewport */}
        <main className="flex-1 lg:pl-64 min-w-0 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {currentTab === 'overview' && (
              <OverviewPage
                onNavigate={tab => setCurrentTab(tab)}
                onOpenAddAccount={handleOpenAddAccount}
                onOpenTakeoutModal={() => setTakeoutModalOpen(true)}
              />
            )}
            {currentTab === 'accounts' && (
              <AccountsPage
                onOpenSetupGuide={() => setSetupGuideOpen(true)}
                onOpenAddAccount={handleOpenAddAccount}
              />
            )}
            {currentTab === 'gmail' && <GmailPage />}
            {currentTab === 'youtube' && (
              <YouTubeHistoryPage onOpenTakeoutModal={() => setTakeoutModalOpen(true)} />
            )}
            {currentTab === 'search' && (
              <SearchHistoryPage onOpenTakeoutModal={() => setTakeoutModalOpen(true)} />
            )}
            {currentTab === 'logs' && <ActivityLogsPage />}
            {currentTab === 'settings' && (
              <SettingsPage onOpenSetupGuide={() => setSetupGuideOpen(true)} />
            )}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <SetupGuideModal
        isOpen={setupGuideOpen}
        onClose={() => setSetupGuideOpen(false)}
      />

      <TakeoutImportModal
        isOpen={takeoutModalOpen}
        onClose={() => setTakeoutModalOpen(false)}
        onSuccess={() => refreshAccounts()}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ModeProvider>
        <AuthProvider>
          <AccountProvider>
            <CommandCenterContent />
          </AccountProvider>
        </AuthProvider>
      </ModeProvider>
    </ToastProvider>
  );
}
