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
  async getApprovedReviewsByProduct(productId: string) {
    const result = await callApi(`/api/reviews/by-product/${encodeURIComponent(productId)}`, 'GET');
    return { data: result.data, error: result.error };
  },
  async submitProductReview(payload: {
    productId: string;
    fullName: string;
    phone?: string;
    rating: number;
    comment: string;
    imageUrl?: string;
  }) {
    const result = await callApi('/api/reviews/submit', 'POST', {
      product_id: payload.productId,
      full_name: payload.fullName,
      phone: payload.phone || '',
      rating: payload.rating,
      comment: payload.comment,
      image_url: payload.imageUrl || '',
    });
    return { data: result.data, error: result.error };
  },
  async moderateReview(payload: { reviewId: string; status: 'pending' | 'approved' | 'hidden' }) {
    const result = await callApi('/api/reviews/moderate', 'POST', {
      review_id: payload.reviewId,
      status: payload.status,
    });
    return { data: result.data, error: result.error };
  },
  async createPromotion(payload: {
    code: string;
    name: string;
    discountPercent: number;
    minOrder: number;
    maxUsesPerUser: number;
    startsAt?: string;
    endsAt?: string;
    isActive?: boolean;
  }) {
    const result = await callApi('/api/promotions/create', 'POST', {
      code: payload.code,
      name: payload.name,
      discount_percent: payload.discountPercent,
      min_order: payload.minOrder,
      max_uses_per_user: payload.maxUsesPerUser,
      starts_at: payload.startsAt || null,
      ends_at: payload.endsAt || null,
      is_active: Boolean(payload.isActive),
    });
    return { data: result.data, error: result.error };
  },
  async assignPromotion(payload: {
    promotionId: string;
    mode: 'all_buyers' | 'min_order' | 'specific_user';
    minOrderAmount?: number;
    targetUserId?: string;
  }) {
    const result = await callApi('/api/promotions/assign', 'POST', {
      promotion_id: payload.promotionId,
      mode: payload.mode,
      min_order_amount: payload.minOrderAmount || 0,
      target_user_id: payload.targetUserId || '',
    });
    return { data: result.data, error: result.error };
  },
  async getPromotionAssignments(promotionId: string) {
    const result = await callApi(`/api/promotions/assignments/${encodeURIComponent(promotionId)}`, 'GET');
    return { data: result.data, error: result.error };
  },
  async getMyAvailablePromotions(orderSubtotal: number) {
    const query = new URLSearchParams({
      order_subtotal: String(Math.max(0, Number(orderSubtotal || 0))),
    });
    const result = await callApi(`/api/promotions/my-available?${query.toString()}`, 'GET');
    return { data: result.data, error: result.error };
  },
  async applyPromotionPreview(payload: { code: string; orderSubtotal: number }) {
    const result = await callApi('/api/promotions/apply-preview', 'POST', {
      code: payload.code,
      order_subtotal: payload.orderSubtotal,
    });
    return { data: result.data, error: result.error };
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
      return { error: result.error, data: result.data };
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
    async requestPasswordResetLink({ email }: any) {
      const result = await callApi('/api/auth/forgot-password/request', 'POST', { email });
      return { error: result.error, data: result.data };
    },
    async verifyPasswordResetCode({ email, code }: any) {
      const result = await callApi('/api/auth/forgot-password/verify', 'POST', {
        email,
        code,
      });
      return { error: result.error, data: result.data };
    },
    async resetPasswordWithCode({ email, code, password }: any) {
      const result = await callApi('/api/auth/forgot-password/reset', 'POST', {
        email,
        code,
        password,
      });
      return { error: result.error, data: result.data };
    },
    async changePassword({ currentPassword, newPassword }: any) {
      const result = await callApi('/api/auth/change-password', 'POST', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return { error: result.error, data: result.data };
    },
    async adminCreateAccount({ fullName, phone, address, email, password, role }: any) {
      const result = await callApi('/api/auth/admin/create-account', 'POST', {
        full_name: fullName,
        phone,
        address,
        email,
        password,
        role,
      });
      return { error: result.error, data: result.data };
    },
    async adminResetAccountPassword({ targetUserId, newPassword }: any) {
      const result = await callApi('/api/auth/admin/reset-account-password', 'POST', {
        target_user_id: targetUserId,
        new_password: newPassword,
      });
      return { error: result.error, data: result.data };
    },
    async getUser() {
      const result = await callApi('/api/auth/user', 'GET');
      return { data: result.data, error: result.error };
    },
  },
};

export const db: any = mysqlApiClient;
