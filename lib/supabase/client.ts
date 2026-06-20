class SupabaseMockBuilder {
  private tableName: string;
  private selects: string = '*';
  private filters: Array<{ type: string; column: string; value: any }> = [];
  private limitCount?: number;
  private singleRow: boolean = false;
  private orderColumn?: string;
  private orderAscending?: boolean;
  private action: 'select' | 'insert' | 'update' = 'select';
  private payload: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields?: string) {
    if (fields) this.selects = fields;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ type: 'in', column, value: values });
    return this;
  }

  or(filterString: string) {
    this.filters.push({ type: 'or', column: '', value: filterString });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.singleRow = true;
    return this;
  }

  insert(payload: any) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  async then(onfulfilled?: (value: any) => any) {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: this.action,
          table: this.tableName,
          payload: this.payload,
          selects: this.selects,
          filters: this.filters,
          limit: this.limitCount,
          single: this.singleRow,
          orderColumn: this.orderColumn,
          orderAscending: this.orderAscending
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        const result = { data: null, error: { message: errText } };
        return onfulfilled ? onfulfilled(result) : result;
      }
      const json = await res.json();
      const result = { data: json.data, error: null };
      return onfulfilled ? onfulfilled(result) : result;
    } catch (err: any) {
      const result = { data: null, error: { message: err.message || String(err) } };
      return onfulfilled ? onfulfilled(result) : result;
    }
  }
}

class SupabaseClientMock {
  auth = {
    async getUser() {
      if (typeof window === 'undefined') {
        return { data: { user: null }, error: null };
      }
      const path = window.location.pathname;
      if (path.startsWith('/citizen')) {
        return {
          data: {
            user: {
              id: 'citizen-id-123',
              email: 'citizen@nagaragupta.gov',
              user_metadata: { name: 'Citizen User', role: 'citizen' }
            }
          },
          error: null
        };
      } else if (path.startsWith('/officer')) {
        return {
          data: {
            user: {
              id: 'officer-id-123',
              email: 'officer@nagaragupta.gov',
              user_metadata: { name: 'Priya Nair', role: 'officer' }
            }
          },
          error: null
        };
      } else {
        return {
          data: {
            user: {
              id: 'admin-id-123',
              email: 'admin@nagaragupta.gov',
              user_metadata: { name: 'Ramesh Babu', role: 'admin' }
            }
          },
          error: null
        };
      }
    },
    async signOut() {
      return { error: null };
    }
  };

  from(tableName: string) {
    return new SupabaseMockBuilder(tableName);
  }

  channel(name: string) {
    return {
      on(event: string, filter: any, callback: () => void) {
        const intervalId = setInterval(callback, 5000);
        (this as any)._intervalId = intervalId;
        return this;
      },
      subscribe() {
        return this;
      }
    };
  }

  removeChannel(chan: any) {
    if (chan && chan._intervalId) {
      clearInterval(chan._intervalId);
    }
  }
}

export function createClient() {
  return new SupabaseClientMock();
}
