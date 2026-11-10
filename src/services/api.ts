export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

let currentRateLimit: RateLimitInfo = {
  limit: 120,
  remaining: 120,
  reset: Math.floor(Date.now() / 1000) + 60,
};

type RateLimitListener = (info: RateLimitInfo) => void;
const rateLimitListeners: RateLimitListener[] = [];

export function subscribeRateLimit(cb: RateLimitListener) {
  rateLimitListeners.push(cb);
  cb(currentRateLimit);
  return () => {
    const idx = rateLimitListeners.indexOf(cb);
    if (idx !== -1) rateLimitListeners.splice(idx, 1);
  };
}

function updateRateLimitHeaders(res: Response) {
  const limit = res.headers.get('X-RateLimit-Limit');
  const remaining = res.headers.get('X-RateLimit-Remaining');
  const reset = res.headers.get('X-RateLimit-Reset');

  if (limit && remaining) {
    currentRateLimit = {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: reset ? parseInt(reset, 10) : Math.floor(Date.now() / 1000) + 60,
    };
    rateLimitListeners.forEach((fn) => fn(currentRateLimit));
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('bv_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  updateRateLimitHeaders(response);

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}`;
    try {
      const data = await response.json();
      errorMessage = data.error || errorMessage;
    } catch {
      // fallback
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ message: string; token: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) =>
      request<{ message: string; token: string; user: any; primaryAccount: any }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => request<{ user: any; accountsCount: number; totalBalance: number }>('/api/auth/me'),
    bootstrapAdmin: (data: { email: string; password: string; firstName: string; lastName: string; secretKey?: string }) =>
      request<{ message: string; token: string; user: any }>('/api/auth/bootstrap-admin', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Accounts
  accounts: {
    list: () => request<{ accounts: any[] }>('/api/accounts'),
    create: (data: { name: string; type: string; currency?: string; initialDeposit?: number }) =>
      request<{ message: string; account: any }>('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    transfer: (data: {
      sourceAccountId: string;
      destinationType: 'INTERNAL' | 'EXTERNAL';
      targetAccountId?: string;
      recipientName?: string;
      routingNumber?: string;
      accountNumber?: string;
      amount: number;
      note?: string;
    }) =>
      request<{ message: string; referenceId: string; transferredAmount: number; newSourceBalance: number }>(
        '/api/accounts/transfer',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      ),
    toggleFreeze: (accountId: string) =>
      request<{ message: string; isCardFrozen: boolean }>(`/api/accounts/${accountId}/toggle-freeze`, {
        method: 'POST',
      }),
    getTransactions: (params?: { accountId?: string; type?: string; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.accountId) query.set('accountId', params.accountId);
      if (params?.type) query.set('type', params.type);
      if (params?.search) query.set('search', params.search);
      return request<{ transactions: any[] }>(`/api/accounts/transactions/all?${query.toString()}`);
    },
    getRequests: () => request<{ requests: any[] }>('/api/accounts/requests'),
    submitRequest: (requestedAccountType: string) =>
      request<{ message: string; request: any }>('/api/accounts/requests', {
        method: 'POST',
        body: JSON.stringify({ requestedAccountType }),
      }),
    recordTransaction: (data: {
      accountId: string;
      type: string;
      amount: number;
      description?: string;
      counterparty?: string;
      category?: string;
    }) =>
      request<{ message: string; transaction: any; updatedAccount: any }>('/api/accounts/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Onboarding
  onboarding: {
    getStatus: () => request<{ userStatus: string; currentTier: string; application: any }>('/api/onboarding/status'),
    submit: (data: any) =>
      request<{ message: string; application: any }>('/api/onboarding/submit', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Admin
  admin: {
    getMetrics: () => request<{ metrics: any; redis: any }>('/api/admin/metrics'),
    getUsers: () => request<{ users: any[] }>('/api/admin/users'),
    updateUserStatus: (userId: string, status: string, reason?: string) =>
      request<{ message: string; user: any }>(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      }),
    updateUserRole: (userId: string, role: string) =>
      request<{ message: string; user: any }>(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    getApplications: () => request<{ applications: any[] }>('/api/admin/applications'),
    reviewApplication: (applicationId: string, decision: 'APPROVED' | 'REJECTED', notes?: string) =>
      request<{ message: string; application: any }>(`/api/admin/applications/${applicationId}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, notes }),
      }),
    getAuditLogs: (params?: { search?: string; severity?: string; action?: string }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.severity) query.set('severity', params.severity);
      if (params?.action) query.set('action', params.action);
      return request<{ auditLogs: any[] }>(`/api/admin/audit-logs?${query.toString()}`);
    },
    resetDemo: () => request<{ message: string }>('/api/admin/system/reset-demo', { method: 'POST' }),
  },
};
