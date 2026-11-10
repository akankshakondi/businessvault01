import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { User, Role, UserStatus } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const AdminUserManagement: React.FC = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Role Edit Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<Role>('USER');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const loadUsers = async () => {
    const token = localStorage.getItem('bv_auth_token');
    if (!token || !currentUser || (!isAdmin && currentUser.role !== 'COMPLIANCE_OFFICER')) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.admin.getUsers();
      setUsers(res.users);
    } catch (err: any) {
      console.warn('Users load notification:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && (isAdmin || currentUser.role === 'COMPLIANCE_OFFICER')) {
      loadUsers();
    }
  }, [currentUser, isAdmin]);

  const handleToggleStatus = async (user: User) => {
    const nextStatus: UserStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const confirmMsg =
      nextStatus === 'SUSPENDED'
        ? `Are you sure you want to SUSPEND ${user.email}? They will immediately lose login and transaction access.`
        : `Reactivate account for ${user.email}?`;

    if (!confirm(confirmMsg)) return;

    try {
      await api.admin.updateUserStatus(
        user.id,
        nextStatus,
        nextStatus === 'SUSPENDED' ? 'Administrative suspension via User Directory' : 'Reactivated by admin'
      );
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status.');
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdatingRole(true);
    try {
      await api.admin.updateUserRole(editingUser.id, newRole);
      setEditingUser(null);
      await loadUsers();
      alert(`User role updated to ${newRole}.`);
    } catch (err: any) {
      alert(err.message || 'Failed to change user role.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.firstName.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">User Directory & RBAC</h2>
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
              {users.length} Total Users
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Control user lifecycles, assign administrative privileges, and suspend compromised accounts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-purple-500 focus:outline-hidden w-52 sm:w-64"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:border-purple-500 focus:outline-hidden"
          >
            <option value="ALL">All Roles</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="COMPLIANCE_OFFICER">COMPLIANCE OFFICER</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:border-purple-500 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="PENDING_VERIFICATION">PENDING</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold">User</th>
                <th className="px-6 py-4 font-bold">Role</th>
                <th className="px-6 py-4 font-bold">Account Status</th>
                <th className="px-6 py-4 font-bold">KYC Tier</th>
                <th className="px-6 py-4 font-bold">Custody Balance</th>
                <th className="px-6 py-4 font-bold">Registered</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No users match the active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              u.avatarUrl ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                            }
                            alt=""
                            className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {u.firstName} {u.lastName}
                              {isCurrent && (
                                <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[9px] font-semibold text-purple-700">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold font-mono ${
                            u.role === 'ADMIN'
                              ? 'bg-rose-100 text-rose-800'
                              : u.role === 'COMPLIANCE_OFFICER'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.status === 'SUSPENDED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              u.status === 'ACTIVE'
                                ? 'bg-emerald-500'
                                : u.status === 'SUSPENDED'
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          {u.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-700">
                        {u.kycTier.replace('TIER_', 'Tier ')}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-slate-900">
                          ${(u.totalBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400">{u.accountsCount || 0} accounts</div>
                      </td>

                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Role modifier */}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setNewRole(u.role);
                              }}
                              disabled={isCurrent}
                              title={isCurrent ? 'Cannot modify your own role' : 'Change RBAC Role'}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                            >
                              Role
                            </button>
                          )}

                          {/* Suspend / Unsuspend */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isCurrent}
                            title={isCurrent ? 'Cannot suspend your own account' : 'Toggle status'}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                              u.status === 'ACTIVE'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Assignment Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Modify Role Assignment</h3>
            <p className="text-xs text-slate-500 mt-1">
              Updating RBAC role for <span className="font-semibold text-slate-800">{editingUser.email}</span>
            </p>

            <form onSubmit={handleSaveRole} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Select Role</label>
                <div className="space-y-2">
                  {[
                    { val: 'USER', label: 'USER', desc: 'Standard client portal, personal banking, transfers' },
                    { val: 'COMPLIANCE_OFFICER', label: 'COMPLIANCE OFFICER', desc: 'KYC queue review, AML screening, audit inspection' },
                    { val: 'ADMIN', label: 'ADMIN', desc: 'Root oversight, user suspension, role management, system settings' },
                  ].map((r) => (
                    <label
                      key={r.val}
                      className={`flex items-start gap-3 rounded-2xl p-3 border cursor-pointer transition-all ${
                        newRole === r.val
                          ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r.val}
                        checked={newRole === r.val}
                        onChange={() => setNewRole(r.val as Role)}
                        className="mt-0.5 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{r.label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRole}
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {isUpdatingRole ? 'Saving...' : 'Apply Role Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
