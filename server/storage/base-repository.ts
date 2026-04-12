import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import type { PgColumn, PgTableWithColumns } from "drizzle-orm/pg-core";

/**
 * Generic CRUD factory — eliminates repetitive storage methods.
 * Uses `any` for table parameter to work around Drizzle's complex generics,
 * but return types are properly typed via TSelect/TInsert.
 */
export function createCrud<TInsert, TSelect>(
  table: any,
  idCol?: PgColumn,
  orderCol?: PgColumn,
) {
  const id = idCol || table.id;
  const order = orderCol || table.createdAt;

  return {
    async getById(idValue: string): Promise<TSelect | undefined> {
      const [entry] = await db.select().from(table).where(eq(id, idValue));
      return entry as TSelect | undefined;
    },

    async getAll(): Promise<TSelect[]> {
      return db.select().from(table).orderBy(desc(order)) as Promise<TSelect[]>;
    },

    async getByField(column: PgColumn, value: string): Promise<TSelect[]> {
      return db.select().from(table).where(eq(column, value)).orderBy(desc(order)) as Promise<TSelect[]>;
    },

    async create(data: TInsert): Promise<TSelect> {
      const result = await db.insert(table).values(data as any).returning();
      return (result as TSelect[])[0];
    },

    async update(idValue: string, data: Partial<TInsert>): Promise<TSelect | undefined> {
      const result = await db.update(table).set(data as any).where(eq(id, idValue)).returning();
      return (result as TSelect[])[0];
    },

    async remove(idValue: string): Promise<void> {
      await db.delete(table).where(eq(id, idValue));
    },
  };
}
