import { createClient } from '@supabase/supabase-js';

type Row = Record<string, any>;
type QueryResult<T = any> = Promise<{ data: T; error: any }>;

const isUiOnly = (import.meta.env.VITE_UI_ONLY ?? 'true') === 'true';

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

const mockDb: Record<string, Row[]> = {
  categories: [],
  products: [],
  profiles: [],
  cart_items: [],
  orders: [],
  order_items: [],
  support_requests: [],
};

const mockUsers = new Map<string, { id: string; email: string; password: string; user_metadata?: Row }>();
const mockOtps = new Map<string, string>();
let currentUser: Row | null = null;
const authListeners = new Set<(event: string, session: any) => void>();

function notifyAuth(event: string) {
  const session = currentUser ? { user: currentUser } : null;
  authListeners.forEach(listener => listener(event, session));
}

function applyFilters(rows: Row[], filters: Array<(row: Row) => boolean>) {
  return rows.filter(row => filters.every(filter => filter(row)));
}

class MockQuery<T = any> {
  private filters: Array<(row: Row) => boolean> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitValue: number | null = null;
  private selectText = '*';
  private returnSingle = false;
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;

  constructor(private table: string) {}

  select(columns = '*') {
    this.selectText = columns;
    return this;
  }

  insert(values: Row | Row[]) {
    this.operation = 'insert';
    this.payload = Array.isArray(values) ? values : [values];
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
    this.filters.push(row => row[column] === value);
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push(row => values.includes(row[column]));
    return this;
  }

  ilike(column: string, pattern: string) {
    const normalized = pattern.replace(/%/g, '').toLowerCase();
    this.filters.push(row => String(row[column] ?? '').toLowerCase().includes(normalized));
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
    this.returnSingle = true;
    return this.execute();
  }

  single() {
    this.returnSingle = true;
    return this.execute();
  }

  then<TResult1 = { data: T; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: T; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }

  private decorate(rows: Row[]) {
    if (this.table === 'products' && this.selectText.includes('categories')) {
      return rows.map(row => ({
        ...row,
        categories: mockDb.categories.find(category => category.id === row.category_id) || null,
      }));
    }

    if (this.table === 'cart_items' && this.selectText.includes('products')) {
      return rows.map(row => ({
        ...row,
        products: mockDb.products.find(product => product.id === row.product_id) || null,
      }));
    }

    if (this.table === 'orders' && this.selectText.includes('order_items')) {
      return rows.map(row => ({
        ...row,
        order_items: mockDb.order_items
          .filter(item => item.order_id === row.id)
          .map(item => ({
            ...item,
            products: mockDb.products.find(product => product.id === item.product_id) || null,
          })),
      }));
    }

    return rows;
  }

  private async execute(): QueryResult<T> {
    const tableRows = mockDb[this.table] || (mockDb[this.table] = []);
    if (this.operation === 'insert') {
      const insertedRows = this.payload.map((item: Row) => ({ id: item.id || createId(), created_at: new Date().toISOString(), ...item }));
      tableRows.unshift(...insertedRows);
      const result = this.decorate(insertedRows);
      return { data: (this.returnSingle ? result[0] || null : result) as T, error: null };
    }

    if (this.operation === 'update') {
      const rows = applyFilters(tableRows, this.filters);
      const updated = rows.map(row => Object.assign(row, this.payload));
      const result = this.decorate(updated);
      return { data: (this.returnSingle ? result[0] || null : result) as T, error: null };
    }

    if (this.operation === 'delete') {
      const toDelete = new Set(applyFilters(tableRows, this.filters).map(row => row.id));
      mockDb[this.table] = tableRows.filter(row => !toDelete.has(row.id));
      return { data: null as T, error: null };
    }

    let rows = applyFilters(tableRows, this.filters);
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      rows = [...rows].sort((a, b) => {
        const av = a[column];
        const bv = b[column];
        if (av === bv) return 0;
        return ascending ? (av > bv ? 1 : -1) : (av > bv ? -1 : 1);
      });
    }
    if (this.limitValue != null) rows = rows.slice(0, this.limitValue);
    const decorated = this.decorate(rows);
    return { data: (this.returnSingle ? decorated[0] || null : decorated) as T, error: null };
  }
}

const mockSupabase = {
  from(table: string) {
    return new MockQuery(table);
  },
  auth: {
    async getSession() {
      return { data: { session: currentUser ? { user: currentUser } : null }, error: null };
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
      if (mockUsers.has(email)) {
        return { error: { message: 'Email đã tồn tại' } };
      }
      const id = createId();
      mockUsers.set(email, { id, email, password, user_metadata: options?.data || {} });
      mockDb.profiles.unshift({
        id,
        full_name: options?.data?.full_name || '',
        phone: '',
        address: '',
        avatar_url: '',
        role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return { error: null };
    },
    async signInWithPassword({ email, password }: any) {
      const user = mockUsers.get(email);
      if (!user || user.password !== password) {
        return { error: { message: 'Invalid login credentials' } };
      }
      currentUser = {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata || {},
      };
      notifyAuth('SIGNED_IN');
      return { error: null };
    },
    async signOut() {
      currentUser = null;
      notifyAuth('SIGNED_OUT');
      return { error: null };
    },
    async signInWithOtp({ email }: any) {
      const code = '123456';
      mockOtps.set(email, code);
      return { error: null };
    },
    async verifyOtp({ email, token }: any) {
      if (mockOtps.get(email) !== token) {
        return { error: { message: 'Invalid OTP' } };
      }
      const user = mockUsers.get(email);
      if (!user) {
        return { error: { message: 'User not found' } };
      }
      currentUser = {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata || {},
      };
      notifyAuth('SIGNED_IN');
      return { error: null };
    },
    async updateUser({ password }: any) {
      if (!currentUser?.email) return { error: { message: 'No active session' } };
      const user = mockUsers.get(currentUser.email);
      if (!user) return { error: { message: 'User not found' } };
      user.password = password;
      return { error: null };
    },
    async getUser() {
      return { data: { user: currentUser }, error: null };
    },
  },
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

type SupabaseClientLike = ReturnType<typeof createClient>;

export const supabase = (isUiOnly
  ? (mockSupabase as unknown as SupabaseClientLike)
  : createClient(supabaseUrl, supabaseAnonKey));
