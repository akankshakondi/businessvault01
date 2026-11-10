import React from 'react';
import {
  LayoutGrid,
  CreditCard,
  Activity,
  Plus,
  Shield,
  Check,
  ChevronRight,
  LogOut,
  Users,
  FileCheck2,
  ScrollText,
  Lock,
  ArrowRightLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export type NavigationTab =
  | 'overview'
  | 'accounts'
  | 'statements'
  | 'account-requests'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-approvals'
  | 'admin-audit-logs';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  pendingApprovalsCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenTransferModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount,
  isOpenMobile,
  onCloseMobile,
  onOpenTransferModal,
}) => {
  const { user, role, isAdmin, isComplianceOfficer, logout } = useAuth();
  const canAccessAdmin = isAdmin || isComplianceOfficer;

  const handleNav = (tab: NavigationTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col bg-[#0F261F] text-slate-300 transition-transform duration-300 ease-in-out border-r border-[#193F34] lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header matching screenshot */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-[#183B31]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#0F261F] font-serif font-bold text-lg shadow-xs">
              b.
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-sans">
              balancevault
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* WORKSPACE Section */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-[#5D8275]">
              WORKSPACE
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => handleNav('overview')}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  currentTab === 'overview'
                    ? 'bg-[#183D33] text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-[#15342C] hover:text-white'
                }`}
              >
                <LayoutGrid className="h-4 w-4 shrink-0 text-[#72A694]" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => handleNav('accounts')}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  currentTab === 'accounts'
                    ? 'bg-[#183D33] text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-[#15342C] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 shrink-0 text-[#72A694]" />
                  <span>Accounts</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-[#5D8275]" />
              </button>

              <button
                onClick={() => handleNav('statements')}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  currentTab === 'statements'
                    ? 'bg-[#183D33] text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-[#15342C] hover:text-white'
                }`}
              >
                <Activity className="h-4 w-4 shrink-0 text-[#72A694]" />
                <span>Statements</span>
              </button>

              {/* Account request button matching reference screenshot highlight */}
              <button
                onClick={() => handleNav('account-requests')}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all border ${
                  currentTab === 'account-requests'
                    ? 'border-[#2D6656] bg-[#1B4337] text-white shadow-xs'
                    : 'border-[#1D453A] bg-[#14342B] text-white hover:bg-[#183D33]'
                }`}
              >
                <Plus className="h-4 w-4 shrink-0 text-[#67C7A3]" />
                <span>Account request</span>
              </button>
            </nav>
          </div>

          {/* Quick Transfer trigger */}
          <div className="px-1">
            <button
              onClick={onOpenTransferModal}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#24594A] py-2.5 text-xs font-semibold text-white hover:bg-[#1B483B] transition-colors shadow-2xs"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Money Transfer</span>
            </button>
          </div>

          {/* Admin Section (visible when logged in as Admin or Officer) */}
          {canAccessAdmin && (
            <div>
              <div className="px-3 mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#5D8275]">
                <span>ADMINISTRATION</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#3FB98B]"></span>
              </div>
              <nav className="space-y-1">
                <button
                  onClick={() => handleNav('admin-dashboard')}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    currentTab === 'admin-dashboard'
                      ? 'bg-[#183D33] text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-[#15342C] hover:text-white'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4 shrink-0 text-[#72A694]" />
                  <span>Admin Overview</span>
                </button>

                <button
                  onClick={() => handleNav('admin-users')}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    currentTab === 'admin-users'
                      ? 'bg-[#183D33] text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-[#15342C] hover:text-white'
                  }`}
                >
                  <Users className="h-4 w-4 shrink-0 text-[#72A694]" />
                  <span>User Directory</span>
                </button>

                <button
                  onClick={() => handleNav('admin-approvals')}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    currentTab === 'admin-approvals'
                      ? 'bg-[#183D33] text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-[#15342C] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileCheck2 className="h-4 w-4 shrink-0 text-[#72A694]" />
                    <span>Review Requests</span>
                  </div>
                  {pendingApprovalsCount > 0 && (
                    <span className="flex h-5 items-center justify-center rounded-full bg-[#E8C547]/20 px-2 text-[10px] font-bold text-[#F4D35E] border border-[#E8C547]/40">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleNav('admin-audit-logs')}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    currentTab === 'admin-audit-logs'
                      ? 'bg-[#183D33] text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-[#15342C] hover:text-white'
                  }`}
                >
                  <ScrollText className="h-4 w-4 shrink-0 text-[#72A694]" />
                  <span>Security Audit</span>
                </button>
              </nav>
            </div>
          )}
        </div>

        {/* Bottom Protected Ledger Card matching screenshot */}
        <div className="p-4 border-t border-[#183B31] bg-[#0A1D17]">
          <div className="rounded-2xl bg-[#112921] p-3.5 border border-[#1A4235] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#173C30] text-[#3EB489]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Protected ledger</p>
                <p className="text-[10px] text-[#63877A]">Secure by design</p>
              </div>
            </div>
            <Check className="h-4 w-4 text-[#3EB489]" />
          </div>

          <div className="mt-3 flex items-center justify-between px-1">
            <span className="text-[9px] font-mono tracking-widest text-[#4C7365] uppercase">
              BALANCEVAULT · PRIVATE
            </span>
            <button
              onClick={logout}
              title="Sign out"
              className="text-[#63877A] hover:text-rose-400 text-[10px] font-medium flex items-center gap-1"
            >
              <LogOut className="h-3 w-3" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
