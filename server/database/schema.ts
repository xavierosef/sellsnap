import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const listings = sqliteTable('listings', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  price: text('price').notNull(),
  category: text('category'),
  thumbnail: text('thumbnail'),
  context: text('context'),
  marketData: text('market_data'),
  aiStats: text('ai_stats'),
  status: text('status').notNull().default('active'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
})

export type Listing = typeof listings.$inferSelect
export type NewListing = typeof listings.$inferInsert
