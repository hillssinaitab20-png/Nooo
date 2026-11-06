import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ConnectedAccount, OAuthServerStatus } from '../types/index.ts';
import { useAuth } from './AuthContext.tsx';
import { useMode } from './ModeContext.tsx';
import { useToast } from './ToastContext.tsx';

interface AccountContextType {
  accounts: ConnectedAccount[];
  activeAccount: ConnectedAccount | null;
  setActiveAccount: (account: ConnectedAccount | null) => void;
  isLoading: boolean;
  oauthStatus: OAuthServerStatus | null;
  refreshAccounts: () => Promise<void>;
  syncAccount: (accountId: string) => Promise<void>;
  disconnectAccount: (accountId: string) => Promise<boolean>;
  deleteAccount: (accountId: string) => Promise<boolean>;
  deleteAccountData: (accountId: string) => Promise<boolean>;
  startAddAccountFlow: () => Promise<{ success: boolean; url?: string; requiresSetup?: boolean }>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { idToken, isAuthorized } = useAuth();
  const { isDemo } = useMode();
  const { success, error, info } = useToast();

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [activeAccount, setActiveAccountState] = useState<ConnectedAccount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [oauthStatus, setOauthStatus] = useState<OAuthServerStatus | null>(null);

  // Fetch OAuth server status (public)
  const fetchOAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = await res.json();
        setOauthStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch OAuth status:', err);
    }
  }, []);

  const refreshAccounts = useCallback(async () => {
    if (!isAuthorized) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/accounts?demo=${isDemo}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const accs: ConnectedAccount[] = data.accounts || [];
        setAccounts(accs);

        // Update active account
        const savedId = localStorage.getItem('acc_active_account_id');
        const matched = accs.find(a => a.accountId === savedId);
        if (matched) {
          setActiveAccountState(matched);
        } else if (accs.length > 0) {
          setActiveAccountState(accs[0]);
          localStorage.setItem('acc_active_account_id', accs[0].accountId);
        } else {
          setActiveAccountState(null);
        }
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [idToken, isAuthorized, isDemo]);

  useEffect(() => {
    fetchOAuthStatus();
  }, [fetchOAuthStatus]);

  useEffect(() => {
    if (isAuthorized) {
      refreshAccounts();
    }
  }, [isAuthorized, isDemo, refreshAccounts]);

  const setActiveAccount = (acc: ConnectedAccount | null) => {
    setActiveAccountState(acc);
    if (acc) {
      localStorage.setItem('acc_active_account_id', acc.accountId);
    } else {
      localStorage.removeItem('acc_active_account_id');
    }
  };

  const syncAccount = async (accountId: string) => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/sync?demo=${isDemo}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (res.ok) {
        success('Account Synchronized', 'Updated connection status and Gmail API metrics.');
        await refreshAccounts();
      } else {
        error('Sync Failed', 'Could not refresh account status from Google.');
      }
    } catch {
      error('Sync Error', 'Network error while contacting server.');
    }
  };

  const disconnectAccount = async (accountId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/disconnect`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (res.ok) {
        info('Account Disconnected', 'Revoked Google OAuth credentials and updated status.');
        await refreshAccounts();
        return true;
      }
      error('Disconnect Failed', 'Failed to disconnect account.');
      return false;
    } catch {
      error('Error', 'Network error while disconnecting.');
      return false;
    }
  };

  const deleteAccount = async (accountId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (res.ok) {
        success('Account Deleted', 'Removed account record and all associated data.');
        await refreshAccounts();
        return true;
      }
      error('Deletion Failed', 'Failed to delete account.');
      return false;
    } catch {
      error('Error', 'Network error while deleting account.');
      return false;
    }
  };

  const deleteAccountData = async (accountId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/data`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (res.ok) {
        success('History Purged', 'Cleared all imported YouTube and Google Search records.');
        return true;
      }
      error('Data Deletion Failed', 'Could not purge imported records.');
      return false;
    } catch {
      error('Error', 'Network error.');
      return false;
    }
  };

  const startAddAccountFlow = async (): Promise<{ success: boolean; url?: string; requiresSetup?: boolean }> => {
    // Check if OAuth credentials are configured
    if (!oauthStatus?.isConfigured) {
      return { success: false, requiresSetup: true };
    }

    try {
      const res = await fetch('/api/auth/google/start', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, url: data.url };
      }
      return { success: false, requiresSetup: true };
    } catch {
      return { success: false };
    }
  };

  return (
    <AccountContext.Provider
      value={{
        accounts,
        activeAccount,
        setActiveAccount,
        isLoading,
        oauthStatus,
        refreshAccounts,
        syncAccount,
        disconnectAccount,
        deleteAccount,
        deleteAccountData,
        startAddAccountFlow,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used within AccountProvider');
  return ctx;
}
