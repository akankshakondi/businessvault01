import React, { useState } from 'react';
import {
  Menu,
  ChevronDown,
  Database,
  ArrowRightLeft,
  UserCheck,
  Shield,
  LogOut,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onOpenSchemaModal: () => void;
  onOpenTransferModal: () => void;
  breadcrumbSection: string;
  breadcrumbPage: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  onOpenSchemaModal,
  onOpenTransferModal,
  breadcrumbSection = 'Workspace',
  breadcrumbPage = 'Overview',
}) => {
  const { user, role, isAdmin, isComplianceOfficer, switchPersona, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // User initials (e.g. Kondi Akanksha -> K, or Alex Morgan -> A)
  const initial = user?.firstName?.charAt(0) || 'K';
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Kondi Akanksha';
  const roleTitle = isAdmin ? 'Administrator' : isComplianceOfficer ? 'Compliance Officer' : 'Account holder';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E2EAE5] bg-white px-4 sm:px-8">
      {/* Left: Mobile trigger & Breadcrumb matching reference screenshot */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb: Workspace / Overview */}
        <div className="flex items-center gap-2 text-xs font-medium text-[#657F74]">
          <span>{breadcrumbSection}</span>
          <span className="text-[#96AEA4]">/</span>
          <span className="font-bold text-[#142B23]">{breadcrumbPage}</span>
        </div>
      </div>

      {/* Right: Systems operational status & Profile matching reference screenshot */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Systems operational badge */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-[#526E63] font-medium">
          <span className="h-2 w-2 rounded-full bg-[#1A6146] inline-block animate-pulse" />
          <span>Systems operational</span>
        </div>

        {/* Database & Architecture quick access */}
        <button
          onClick={onOpenSchemaModal}
          className="hidden md:flex items-center gap-1.5 text-xs text-[#526E63] hover:text-[#142B23] transition-colors"
        >
          <Database className="h-3.5 w-3.5" />
          <span>Schema & DDL</span>
        </button>

        {/* Profile Circle & Dropdown matching screenshot */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-[#F2F7F4] transition-all"
          >
            {/* Circle avatar with initial */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DEECE5] text-[#143B2E] font-bold text-xs">
              {initial}
            </div>

            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#122A22] leading-tight">{displayName}</p>
              <p className="text-[10px] text-[#638075]">{roleTitle}</p>
            </div>

            <ChevronDown className="h-3.5 w-3.5 text-[#638075]" />
          </button>

          {/* Profile & Persona Switcher Popover */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#DCE6E1] bg-white p-3 shadow-xl z-50">
              <div className="pb-2.5 mb-2 border-b border-[#EDF3EF] px-1">
                <p className="text-xs font-bold text-[#122A22]">{displayName}</p>
                <p className="text-[11px] text-[#638075] truncate">{user?.email}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#638075] px-2 block">
                  Switch Persona (Demo)
                </span>

                <button
                  onClick={() => {
                    switchPersona('user');
                    setShowProfileMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between ${
                    role === 'USER' ? 'bg-[#EDF5F1] text-[#143B2E] font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <p className="font-semibold">Kondi Akanksha</p>
                    <p className="text-[10px] text-[#638075]">Account Holder</p>
                  </div>
                  {role === 'USER' && <span className="h-2 w-2 rounded-full bg-[#1A6146]" />}
                </button>

                <button
                  onClick={() => {
                    switchPersona('admin');
                    setShowProfileMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between ${
                    isAdmin ? 'bg-[#EDF5F1] text-[#143B2E] font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <p className="font-semibold">System Administrator</p>
                    <p className="text-[10px] text-[#805018]">Bank Root Admin</p>
                  </div>
                  {isAdmin && <span className="h-2 w-2 rounded-full bg-[#1A6146]" />}
                </button>

                <div className="pt-2 mt-1 border-t border-[#EDF3EF]">
                  <button
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
