/**
 * Web stand-in for 'expo-sqlite' (wired in metro.config.js for web only).
 * expo-sqlite on the web needs cross-origin isolation headers, which GitHub
 * Pages can't send, so this runs SQLite with sql.js (WebAssembly) and saves
 * the database to localStorage. It covers the calls src/db uses.
 */

type Param = string | number | null | boolean | undefined | Uint8Array;
type Params = Param[] | [Param[]];

interface SqlJsStatement {
  bind(values: unknown[]): void;
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): void;
}
interface SqlJsDatabase {
  exec(sql: string): unknown;
  run(sql: string, params?: unknown[]): void;
  prepare(sql: string): SqlJsStatement;
  getRowsModified(): number;
  export(): Uint8Array;
  close(): void;
}
interface SqlJsStatic {
  Database: new (data?: Uint8Array) => SqlJsDatabase;
}

/** Where the app is served from, e.g. "/nova-prototype" on GitHub Pages. */
function basePath(): string {
  const fromEnv = process.env.EXPO_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const script = document.querySelector<HTMLScriptElement>('script[src*="/_expo/static/js/"]');
  return script ? new URL(script.src).pathname.split('/_expo/')[0]! : '';
}

let sqlJs: Promise<SqlJsStatic> | null = null;
function loadSqlJs(): Promise<SqlJsStatic> {
  sqlJs ??= new Promise<SqlJsStatic>((resolve, reject) => {
    const w = window as unknown as { initSqlJs?: (o: { locateFile: (f: string) => string }) => Promise<SqlJsStatic> };
    const base = basePath();
    const init = () => w.initSqlJs!({ locateFile: (f) => `${base}/${f}` }).then(resolve, reject);
    if (w.initSqlJs) return void init();
    const script = document.createElement('script');
    script.src = `${base}/sql-wasm.js`;
    script.onload = init;
    script.onerror = () => reject(new Error('Could not load the database engine'));
    document.head.appendChild(script);
  });
  return sqlJs;
}

const storageKey = (name: string) => `sqlite:${name}`;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function normalize(params: Params): unknown[] {
  const list = params.length === 1 && Array.isArray(params[0]) ? (params[0] as Param[]) : (params as Param[]);
  return list.map((p) => (p === undefined ? null : typeof p === 'boolean' ? (p ? 1 : 0) : p));
}

class WebDatabase {
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** sql.js has one connection: transactions run one at a time. */
  private txQueue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly name: string,
    private readonly db: SqlJsDatabase,
  ) {
    const flush = () => this.saveNow();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  }

  saveNow() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    try {
      localStorage.setItem(storageKey(this.name), toBase64(this.db.export()));
    } catch {
      // Storage full or blocked: data stays for this visit.
    }
  }

  private changed() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 250);
  }

  async execAsync(sql: string) {
    this.db.exec(sql);
    this.changed();
  }

  async runAsync(sql: string, ...params: Params) {
    this.db.run(sql, normalize(params));
    const changes = this.db.getRowsModified();
    const last = this.query<{ id: number }>('SELECT last_insert_rowid() AS id', [])[0];
    this.changed();
    return { lastInsertRowId: last?.id ?? 0, changes };
  }

  async getAllAsync<T>(sql: string, ...params: Params): Promise<T[]> {
    return this.query<T>(sql, normalize(params));
  }

  async getFirstAsync<T>(sql: string, ...params: Params): Promise<T | null> {
    return this.query<T>(sql, normalize(params))[0] ?? null;
  }

  withTransactionAsync(task: () => Promise<void>) {
    return this.withExclusiveTransactionAsync(() => task());
  }

  withExclusiveTransactionAsync(task: (tx: WebDatabase) => Promise<void>): Promise<void> {
    const run = async () => {
      this.db.exec('BEGIN');
      try {
        await task(this);
        this.db.exec('COMMIT');
      } catch (err) {
        this.db.exec('ROLLBACK');
        throw err;
      } finally {
        this.changed();
      }
    };
    const next = this.txQueue.then(run, run);
    this.txQueue = next.catch(() => {});
    return next;
  }

  async closeAsync() {
    this.saveNow();
  }

  private query<T>(sql: string, params: unknown[]): T[] {
    const stmt = this.db.prepare(sql);
    try {
      if (params.length) stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  }
}

const open = new Map<string, Promise<WebDatabase>>();

export function openDatabaseAsync(name: string): Promise<WebDatabase> {
  let db = open.get(name);
  if (!db) {
    db = loadSqlJs().then((SQL) => {
      const saved = localStorage.getItem(storageKey(name));
      return new WebDatabase(name, new SQL.Database(saved ? fromBase64(saved) : undefined));
    });
    open.set(name, db);
  }
  return db;
}

export async function deleteDatabaseAsync(name: string) {
  open.delete(name);
  localStorage.removeItem(storageKey(name));
}

export type SQLiteDatabase = WebDatabase;
