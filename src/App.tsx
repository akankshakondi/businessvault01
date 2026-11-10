import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Sidebar, NavigationTab } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { UserDashboard } from './components/UserDashboard.tsx';
import { AccountManagement } from './components/AccountManagement.tsx';
import { AccountRequestView } from './components/AccountRequestView.tsx';
import { StatementsView } from './components/StatementsView.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AdminUserManagement } from './components/AdminUserManagement.tsx';
import { ApplicationApprovals } from './components/ApplicationApprovals.tsx';
import { AuditLogsView } from './components/AuditLogsView.tsx';
import { TransferModal } from './components/TransferModal.tsx';
import { NewAccountModal } from './components/NewAccountModal.tsx';
import { AddTransactionModal } from './components/AddTransactionModal.tsx';
import { DatabaseSchemaModal } from './components/DatabaseSchemaModal.tsx';
import { Account } from './types/index.ts';
import { api } from './services/api.ts';

function DashboardContent() {
  const { user, role, isAdmin, isComplianceOfficer, isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(1);

  // Modals
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);

  // User accounts cache for transfer modal
  const [accounts, setAccounts] = useState<Account[]>([]);

  const loadAccounts = async () => {
    try {
      const res = await api.accounts.list();
      setAccounts(res.accounts || []);
    } catch {
      // not authenticated or network error
    }
  };

  const refreshPendingCount = async () => {
    try {
      if (isAdmin || isComplianceOfficer) {
        const res = await api.admin.getApplications();
        const pending = (res.applications || []).filter(
          (a) => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW'
        ).length;
        setPendingApprovalsCount(pending);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAccounts();
      refreshPendingCount();
    }
  }, [isAuthenticated, role]);

  // Adjust active tab if user role changes away from admin
  useEffect(() => {
    if (!isAdmin && !isComplianceOfficer && currentTab.startsWith('admin-')) {
      setCurrentTab('overview');
    }
  }, [role, isAdmin, isComplianceOfficer]);

  const getBreadcrumbs = () => {
    switch (currentTab) {
      case 'overview':
        return { section: 'Workspace', page: 'Overview' };
      case 'accounts':
        return { section: 'Workspace', page: 'Accounts' };
      case 'statements':
        return { section: 'Workspace', page: 'Statements' };
      case 'account-requests':
        return { section: 'Workspace', page: 'Account request' };
      case 'admin-dashboard':
        return { section: 'Administration', page: 'Admin Overview' };
      case 'admin-users':
        return { section: 'Administration', page: 'User Directory' };
      case 'admin-approvals':
        return { section: 'Administration', page: 'Review Requests' };
      case 'admin-audit-logs':
        return { section: 'Administration', page: 'Security Audit' };
      default:
        return { section: 'Workspace', page: 'Overview' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0F261F] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0F261F] font-serif font-bold text-2xl shadow-xl animate-pulse">
            b.
          </div>
          <p className="font-mono text-xs tracking-widest uppercase text-[#73A593]">
            Connecting to BalanceVault core...
          </p>
        </div>
      </div>
    );
  }

  // When not signed in or logged out, present the dedicated LoginPage
  if (!isAuthenticated || !user) {
    return <LoginPage onSuccess={loadAccounts} />;
  }

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex min-h-screen bg-[#F8FAF9] font-sans selection:bg-[#1A4337] selection:text-white">
      {/* Dark Forest Green Sidebar matching screenshot */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        pendingApprovalsCount={pendingApprovalsCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenTransferModal={() => setIsTransferModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header
          onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenSchemaModal={() => setIsSchemaModalOpen(true)}
          onOpenTransferModal={() => setIsTransferModalOpen(true)}
          breadcrumbSection={breadcrumbs.section}
          breadcrumbPage={breadcrumbs.page}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">
          {currentTab === 'overview' && (
            <UserDashboard
              onOpenTransfer={() => setIsTransferModalOpen(true)}
              onOpenNewAccount={() => setIsNewAccountModalOpen(true)}
              onNavigateToTab={(tab) => setCurrentTab(tab as NavigationTab)}
              onOpenAddTransaction={() => setIsAddTransactionModalOpen(true)}
            />
          )}

          {currentTab === 'accounts' && (
            <AccountManagement
              onOpenTransfer={() => setIsTransferModalOpen(true)}
              onOpenNewAccount={() => setIsNewAccountModalOpen(true)}
            />
          )}

          {currentTab === 'statements' && (
            <StatementsView onOpenAddTransaction={() => setIsAddTransactionModalOpen(true)} />
          )}

          {/* Exact screen from user's attached screenshot */}
          {currentTab === 'account-requests' && <AccountRequestView />}

          {currentTab === 'admin-dashboard' && (
            <AdminDashboard
              onNavigateTab={(tab) => setCurrentTab(tab as NavigationTab)}
              onRefreshGlobalCounts={refreshPendingCount}
            />
          )}

          {currentTab === 'admin-users' && <AdminUserManagement />}

          {currentTab === 'admin-approvals' && (
            <ApplicationApprovals onRefreshPending={refreshPendingCount} />
          )}

          {currentTab === 'admin-audit-logs' && <AuditLogsView />}
        </main>
      </div>

      {/* Global Modals */}
      <AddTransactionModal
        isOpen={isAddTransactionModalOpen}
        onClose={() => setIsAddTransactionModalOpen(false)}
        accounts={accounts}
        onTransactionAdded={() => {
          loadAccounts();
        }}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        accounts={accounts}
        onTransferSuccess={() => {
          loadAccounts();
        }}
      />

      <NewAccountModal
        isOpen={isNewAccountModalOpen}
        onClose={() => setIsNewAccountModalOpen(false)}
        onAccountCreated={() => {
          loadAccounts();
        }}
      />

      <DatabaseSchemaModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
