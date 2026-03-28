type Row = Record<string, any>;
type Filter = { column: string; op: 'eq' | 'in' | 'ilike'; value: any };

const authServerBase = (import.meta.env.VITE_AUTH_SERVER_URL || 'http://localhost:4000').replace(/\/$/, '');

async function callApi(path: string, method = 'GET', body?: any) {
  const response = await fetch(`${authServerBase}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      data: null,
      error: payload?.error || { message: 'Request failed' },
    };
  }
  return {
    data: payload?.data ?? payload,
    error: payload?.error ?? null,
  };
}

const authListeners = new Set<(event: string, session: any) => void>();

function emitAuth(event: string, session: any) {
  authListeners.forEach(listener => listener(event, session));
}

class ApiQueryBuilder<T = any> {
  private filters: Filter[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitValue: number | null = null;
  private selectText = '*';
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private singleResult = false;

  constructor(private table: string) {}

  select(columns = '*') {
    this.selectText = columns;
    return this;
  }

  insert(values: Row | Row[]) {
    this.operation = 'insert';
    this.payload = values;
    return this;
  }

  update(values: Row) {
    this.operation = 'update';
    this.payload = values;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, op: 'eq', value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, op: 'in', value: values });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.filters.push({ column, op: 'ilike', value: pattern });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  maybeSingle() {
    this.singleResult = true;
    return this.execute();
  }

  single() {
    this.singleResult = true;
    return this.execute();
  }

  then<TResult1 = { data: T; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: T; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }

  private async execute() {
    if (this.operation === 'select') {
      const result = await callApi('/api/db/query', 'POST', {
        table: this.table,
        select: this.selectText,
        filters: this.filters,
        order: this.orderBy,
        limit: this.limitValue,
      });
      return {
        data: this.singleResult ? (result.data?.[0] || null) : result.data,
        error: result.error,
      };
    }

    if (this.operation === 'insert') {
      const result = await callApi('/api/db/insert', 'POST', {
        table: this.table,
        values: this.payload,
        select: this.selectText,
      });
      return {
        data: this.singleResult ? (result.data?.[0] || null) : result.data,
        error: result.error,
      };
    }

    if (this.operation === 'update') {
      const result = await callApi('/api/db/update', 'POST', {
        table: this.table,
        values: this.payload,
        filters: this.filters,
        select: this.selectText,
      });
      return {
        data: this.singleResult ? (result.data?.[0] || null) : result.data,
        error: result.error,
      };
    }

    const result = await callApi('/api/db/delete', 'POST', {
      table: this.table,
      filters: this.filters,
    });
    return { data: result.data, error: result.error };
  }
}

const mysqlApiClient = {
  from(table: string) {
    return new ApiQueryBuilder(table);
  },
  async rpc(fn: string, args: unknown) {
    const result = await callApi('/api/db/rpc', 'POST', { fn, args });
    return { data: result.data, error: result.error };
  },
  async uploadImage(file: Blob, fileName = 'image.jpg') {
    const mimeType = file.type || 'application/octet-stream';
    const response = await fetch(`${authServerBase}/api/images/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': mimeType,
        'X-File-Name': encodeURIComponent(fileName),
      },
      body: file,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        data: null,
        error: payload?.error || { message: 'IMAGE_UPLOAD_FAILED' },
      };
    }
    return {
      data: payload?.data ?? null,
      error: payload?.error ?? null,
    };
  },
  auth: {
    async getSession() {
      const result = await callApi('/api/auth/session', 'GET');
      return { data: result.data, error: result.error };
    },
    onAuthStateChange(callback: (event: string, session: any) => void) {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(callback),
          },
        },
      };
    },
    async signUp({ email, password, options }: any) {
      const result = await callApi('/api/auth/register', 'POST', {
        email,
        password,
        full_name: options?.data?.full_name || '',
      });
      if (!result.error) {
        emitAuth('SIGNED_IN', { user: result.data?.user || null });
      }
      return { error: result.error };
    },
    async signInWithPassword({ email, password }: any) {
      const result = await callApi('/api/auth/login', 'POST', { email, password });
      if (!result.error) {
        emitAuth('SIGNED_IN', { user: result.data?.user || null });
      }
      return { error: result.error };
    },
    async signOut() {
      const result = await callApi('/api/auth/logout', 'POST');
      emitAuth('SIGNED_OUT', null);
      return { error: result.error };
    },
    async signInWithOtp({ email, options }: any) {
      const result = await callApi('/api/auth/send-otp', 'POST', {
        email,
        shouldCreateUser: Boolean(options?.shouldCreateUser),
      });
      return { error: result.error };
    },
    async verifyOtp({ email, token }: any) {
      const result = await callApi('/api/auth/verify-otp', 'POST', {
        email,
        token,
      });
      if (!result.error) {
        emitAuth('SIGNED_IN', { user: result.data?.user || null });
      }
      return { error: result.error };
    },
    async updateUser({ password }: any) {
      const result = await callApi('/api/auth/update-password', 'POST', { password });
      return { error: result.error };
    },
    async getUser() {
      const result = await callApi('/api/auth/user', 'GET');
      return { data: result.data, error: result.error };
    },
  },
};

export const db: any = mysqlApiClient;
