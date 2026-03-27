import supabase from "../lib/supabase.js";

export type QueryResult<T> = {
  data: T | null;
  error: string | null;
};

function logQuery(operation: string, table: string, details?: unknown) {
  console.log(`[DB] ${operation} on "${table}"`, details ?? "");
}

function logError(operation: string, table: string, err: unknown) {
  console.error(`[DB ERROR] ${operation} on "${table}":`, err);
}

function requireFilters(operation: string, table: string, filters: Record<string, unknown>) {
  if (!filters || Object.keys(filters).length === 0) {
    throw new Error(
      `[DB] ${operation} on "${table}" rejected: at least one filter is required to prevent full-table operations.`,
    );
  }
}

export async function findAll<T = Record<string, unknown>>(
  table: string,
  options?: {
    columns?: string;
    filters?: Record<string, unknown>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  },
): Promise<QueryResult<T[]>> {
  logQuery("SELECT", table, options);
  try {
    let query = supabase.from(table).select(options?.columns ?? "*");

    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        query = query.eq(key, value);
      }
    }
    if (options?.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true,
      });
    }
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) {
      const effectiveLimit = options.limit ?? 100;
      query = query.range(options.offset, options.offset + effectiveLimit - 1);
    }

    const { data, error } = await query;
    if (error) {
      logError("SELECT", table, error.message);
      return { data: null, error: error.message };
    }
    return { data: data as T[], error: null };
  } catch (err) {
    logError("SELECT", table, err);
    return { data: null, error: String(err) };
  }
}

export async function findOne<T = Record<string, unknown>>(
  table: string,
  filters: Record<string, unknown>,
  columns?: string,
): Promise<QueryResult<T>> {
  logQuery("SELECT_ONE", table, filters);
  try {
    let query = supabase.from(table).select(columns ?? "*");
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    const { data, error } = await query.single();
    if (error) {
      logError("SELECT_ONE", table, error.message);
      return { data: null, error: error.message };
    }
    return { data: data as T, error: null };
  } catch (err) {
    logError("SELECT_ONE", table, err);
    return { data: null, error: String(err) };
  }
}

export async function insertOne<T = Record<string, unknown>>(
  table: string,
  record: Record<string, unknown>,
): Promise<QueryResult<T>> {
  logQuery("INSERT", table, record);
  try {
    const { data, error } = await supabase
      .from(table)
      .insert(record)
      .select()
      .single();
    if (error) {
      logError("INSERT", table, error.message);
      return { data: null, error: error.message };
    }
    return { data: data as T, error: null };
  } catch (err) {
    logError("INSERT", table, err);
    return { data: null, error: String(err) };
  }
}

export async function insertMany<T = Record<string, unknown>>(
  table: string,
  records: Record<string, unknown>[],
): Promise<QueryResult<T[]>> {
  logQuery("INSERT_MANY", table, { count: records.length });
  try {
    const { data, error } = await supabase
      .from(table)
      .insert(records)
      .select();
    if (error) {
      logError("INSERT_MANY", table, error.message);
      return { data: null, error: error.message };
    }
    return { data: data as T[], error: null };
  } catch (err) {
    logError("INSERT_MANY", table, err);
    return { data: null, error: String(err) };
  }
}

export async function updateOne<T = Record<string, unknown>>(
  table: string,
  filters: Record<string, unknown>,
  updates: Record<string, unknown>,
): Promise<QueryResult<T>> {
  logQuery("UPDATE", table, { filters, updates });
  try {
    requireFilters("UPDATE", table, filters);
    let query = supabase.from(table).update(updates);
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    const { data, error } = await query.select().single();
    if (error) {
      logError("UPDATE", table, error.message);
      return { data: null, error: error.message };
    }
    return { data: data as T, error: null };
  } catch (err) {
    logError("UPDATE", table, err);
    return { data: null, error: String(err) };
  }
}

export async function updateMany<T = Record<string, unknown>>(
  table: string,
  filters: Record<string, unknown>,
  updates: Record<string, unknown>,
): Promise<QueryResult<T[]>> {
  logQuery("UPDATE_MANY", table, { filters, updates });
  try {
    requireFilters("UPDATE_MANY", table, filters);
    let query = supabase.from(table).update(updates);
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    const { data, error } = await query.select();
    if (error) {
      logError("UPDATE_MANY", table, error.message);
      return { data: null, error: error.message };
    }
    return { data: data as T[], error: null };
  } catch (err) {
    logError("UPDATE_MANY", table, err);
    return { data: null, error: String(err) };
  }
}

export async function deleteOne(
  table: string,
  filters: Record<string, unknown>,
): Promise<QueryResult<null>> {
  logQuery("DELETE", table, filters);
  try {
    requireFilters("DELETE", table, filters);
    let query = supabase.from(table).delete();
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    const { error } = await query;
    if (error) {
      logError("DELETE", table, error.message);
      return { data: null, error: error.message };
    }
    return { data: null, error: null };
  } catch (err) {
    logError("DELETE", table, err);
    return { data: null, error: String(err) };
  }
}

export async function rpc<T = unknown>(
  fnName: string,
  params?: Record<string, unknown>,
): Promise<QueryResult<T>> {
  logQuery("RPC", fnName, params);
  try {
    const { data, error } = await supabase.rpc(fnName, params);
    if (error) {
      logError("RPC", fnName, error.message);
      return { data: null, error: error.message };
    }
    return { data: data as T, error: null };
  } catch (err) {
    logError("RPC", fnName, err);
    return { data: null, error: String(err) };
  }
}

const db = {
  findAll,
  findOne,
  insertOne,
  insertMany,
  updateOne,
  updateMany,
  deleteOne,
  rpc,
  client: supabase,
};

export default db;
