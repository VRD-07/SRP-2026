import React, { useState, useEffect } from 'react';
import { UserCheck, UserPlus, KeyRound, Power } from 'lucide-react';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassInput } from '../../components/ui/GlassInput';
import { GlassModal } from '../../components/ui/GlassModal';
import { GlassTable, Column } from '../../components/ui/GlassTable';
import { clerkService, ClerkUser } from '../../services/clerkService';

export const ClerksPage: React.FC = () => {
  const [clerks, setClerks] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedClerk, setSelectedClerk] = useState<ClerkUser | null>(null);

  // Forms
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchClerks = async () => {
    try {
      setLoading(true);
      const res = await clerkService.getAll();
      if (res.success) setClerks(res.data);
    } catch (err) {
      console.error('Failed to load clerks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClerks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await clerkService.create({ name, email, password });
      setCreateModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      fetchClerks();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create clerk');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (clerk: ClerkUser) => {
    const action = clerk.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${clerk.name}'s cashier account?`)) return;

    try {
      await clerkService.toggleStatus(clerk.id);
      fetchClerks();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClerk) return;

    setFormError(null);
    setSubmitting(true);

    try {
      await clerkService.resetPassword(selectedClerk.id, newPassword);
      setResetModalOpen(false);
      setNewPassword('');
      alert(`Password successfully updated for ${selectedClerk.name}`);
    } catch (err: any) {
      setFormError(err.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<ClerkUser>[] = [
    {
      key: 'name',
      header: 'Cashier / Clerk Name',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-spruce/15 text-spruce-700 flex items-center justify-center font-bold text-xs">
            {item.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-bold text-sm text-charcoal block">{item.name}</span>
            <span className="text-xs text-muted">{item.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Role',
      render: (item) => (
        <GlassBadge variant="cyan" size="sm">
          Bursar Cashier
        </GlassBadge>
      ),
    },
    {
      key: 'transactions',
      header: 'Collections Recorded',
      render: (item) => (
        <span className="font-bold text-xs text-charcoal">
          {item._count?.recordedTransactions || 0} Transactions
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Account Status',
      render: (item) => (
        <GlassBadge variant={item.isActive ? 'success' : 'danger'} size="sm">
          {item.isActive ? 'ACTIVE' : 'DEACTIVATED'}
        </GlassBadge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => {
              setSelectedClerk(item);
              setNewPassword('');
              setFormError(null);
              setResetModalOpen(true);
            }}
            className="p-1.5 rounded-lg text-muted hover:text-olive-700 hover:bg-white/80 transition-colors cursor-pointer"
            title="Reset Password"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggle(item)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              item.isActive
                ? 'text-muted hover:text-terracotta hover:bg-white/80'
                : 'text-muted hover:text-olive-700 hover:bg-white/80'
            }`}
            title={item.isActive ? 'Deactivate Account' : 'Activate Account'}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-charcoal tracking-tight">
            Accounts Staff & Cashiers
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Manage fee collection desk permissions, deactivate accounts, and reset credentials.
          </p>
        </div>

        <GlassButton
          variant="primary"
          onClick={() => {
            setFormError(null);
            setCreateModalOpen(true);
          }}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add New Clerk
        </GlassButton>
      </div>

      <GlassTable
        columns={columns}
        data={clerks}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        emptyMessage="No clerk accounts configured."
      />

      {/* Create Clerk Modal */}
      <GlassModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Cashier Account"
        description="Grants fee recording and collection permissions."
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-terracotta/15 border border-terracotta/30 text-xs text-terracotta font-medium">
              {formError}
            </div>
          )}

          <GlassInput
            label="Full Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Anita Verma"
          />

          <GlassInput
            label="Institutional Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="anita.verma@college.edu"
          />

          <GlassInput
            label="Initial Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            helperText="Minimum 6 characters"
          />

          <div className="pt-3 border-t border-olive-500/15 flex items-center justify-end gap-2">
            <GlassButton type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" isLoading={submitting}>
              Create Account
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* Reset Password Modal */}
      <GlassModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={`Reset Password for ${selectedClerk?.name}`}
        description="Set a new secure password for this accounts officer."
        maxWidth="md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-terracotta/15 border border-terracotta/30 text-xs text-terracotta font-medium">
              {formError}
            </div>
          )}

          <GlassInput
            label="New Password"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            helperText="Minimum 6 characters"
          />

          <div className="pt-3 border-t border-olive-500/15 flex items-center justify-end gap-2">
            <GlassButton type="button" variant="secondary" onClick={() => setResetModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" isLoading={submitting}>
              Update Password
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
