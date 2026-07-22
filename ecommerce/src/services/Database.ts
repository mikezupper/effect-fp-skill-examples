import { SqlClient } from "@effect/sql"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { Config, Effect, Layer, String as Str } from "effect"

// DB stays snake_case, domain stays camelCase — defined once, shared by the live
// layer and the in-memory test layer so they cannot drift.
export const sqlTransforms = {
  transformQueryNames: Str.camelToSnake,
  transformResultNames: Str.snakeToCamel,
} as const

export const SqlLive = SqliteClient.layerConfig({
  filename: Config.string("DB_FILE").pipe(Config.withDefault("ecommerce.db")),
  transformQueryNames: Config.succeed(sqlTransforms.transformQueryNames),
  transformResultNames: Config.succeed(sqlTransforms.transformResultNames),
})

// Example-sized migrations: idempotent DDL + seed run at startup.
// A production app would use @effect/sql Migrator with numbered files instead
// (see the skill's references/database.md).
const ddl = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  yield* sql`CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, parent_id TEXT
  )`
  yield* sql`CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    description TEXT NOT NULL, price_cents INTEGER NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id), stock INTEGER NOT NULL
  )`
  yield* sql`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, created_at TEXT NOT NULL
  )`
  yield* sql`CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
  )`
  yield* sql`CREATE TABLE IF NOT EXISTS cart_items (
    user_id TEXT NOT NULL, product_id TEXT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL, PRIMARY KEY (user_id, product_id)
  )`
  yield* sql`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, total_cents INTEGER NOT NULL,
    placed_at TEXT NOT NULL
  )`
  yield* sql`CREATE TABLE IF NOT EXISTS order_lines (
    order_id TEXT NOT NULL REFERENCES orders(id), product_id TEXT NOT NULL,
    name TEXT NOT NULL, unit_price_cents INTEGER NOT NULL, quantity INTEGER NOT NULL
  )`

  // Seed catalog (fixed ids so examples and tests are predictable)
  yield* sql`INSERT OR IGNORE INTO categories (id, name, slug, parent_id) VALUES
    ('cat-electronics', 'Electronics', 'electronics', NULL),
    ('cat-laptops', 'Laptops', 'laptops', 'cat-electronics'),
    ('cat-audio', 'Audio', 'audio', 'cat-electronics'),
    ('cat-books', 'Books', 'books', NULL)`
  yield* sql`INSERT OR IGNORE INTO products (id, sku, name, description, price_cents, category_id, stock) VALUES
    ('p-laptop-pro', 'LAP-PRO-14', 'Laptop Pro 14', 'A very fast laptop', 199900, 'cat-laptops', 5),
    ('p-laptop-air', 'LAP-AIR-13', 'Laptop Air 13', 'A very light laptop', 129900, 'cat-laptops', 10),
    ('p-earbuds', 'AUD-EARB-1', 'Wireless Earbuds', 'Tiny speakers for your ears', 19900, 'cat-audio', 50),
    ('p-headphones', 'AUD-HEAD-1', 'Studio Headphones', 'Big speakers for your ears', 34900, 'cat-audio', 3),
    ('p-dmmf', 'BOOK-DMMF', 'Domain Modeling Made Functional', 'Wlaschin. Read it.', 4999, 'cat-books', 100)`
})

export const MigrationsLive = Layer.effectDiscard(ddl)

// SqlClient with schema applied — what everything else builds on.
export const DatabaseLive = MigrationsLive.pipe(Layer.provideMerge(SqlLive))
