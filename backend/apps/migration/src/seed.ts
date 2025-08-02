/**
 * @todo
 * 環境別に流用できるようにライブラリパッケージとしても公開するインターフェースデザインにする
 *
 * packages/database/src/schema.ts
 *
 * @see https://orm.drizzle.team/docs/seed-overview
 *
 * import { pgTable, integer, text } from "drizzle-orm/pg-core";
 * import { drizzle } from "drizzle-orm/node-postgres";
 * import { seed } from "drizzle-seed";
 *
 * const users = pgTable("users", {
 *   id: integer().primaryKey(),
 *   name: text().notNull(),
 * });
 *
 * async function main() {
 *   const db = drizzle(process.env.DATABASE_URL!);
 *   await seed(db, { users });
 * }
 *
 * main();
 */
export async function seed() {
  console.log('Please use the appropriate seeding tool.')
}
