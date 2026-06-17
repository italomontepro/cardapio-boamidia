// SPARSE TABLE CONVENTION (D-05/D-06):
// A row in product_availability means the product is UNAVAILABLE at that unit.
// Absence of a row means the product is AVAILABLE at that unit (default).
// Never bulk-insert rows for every product x unit pair -- only insert on
// explicit "mark unavailable" actions (Phase 4).

import {
  pgTable, pgEnum, uuid, text, boolean, timestamp, integer, numeric, unique, index,
} from 'drizzle-orm/pg-core'

export const adminRoleEnum = pgEnum('admin_role', ['super_admin', 'restaurant_admin'])

export const restaurants = pgTable('restaurants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// admin_users.user_id references auth.users(id) -- auth schema not modeled in Drizzle.
// The FK to auth.users(id) is added via raw SQL in this same migration (see Task 2).
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  role: adminRoleEnum('role').notNull(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_admin_users_user_id').on(table.userId),
  index('idx_admin_users_restaurant_id').on(table.restaurantId),
])

export const units = pgTable('units', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  address: text('address'),
  whatsappNumber: text('whatsapp_number'),
  hours: text('hours'),
  lat: numeric('lat', { precision: 10, scale: 7, mode: 'number' }),
  lng: numeric('lng', { precision: 10, scale: 7, mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('units_restaurant_slug_unique').on(table.restaurantId, table.slug),
  index('idx_units_restaurant_id').on(table.restaurantId),
])

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_categories_restaurant_id').on(table.restaurantId),
])

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  imageUrl: text('image_url'),
  isFeatured: boolean('is_featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_products_restaurant_id').on(table.restaurantId),
  index('idx_products_category_id').on(table.categoryId),
])

// Sparse table per D-05/D-06: a row's mere existence = product UNAVAILABLE at that unit.
// Absence of a row = product is AVAILABLE by default. No row is created for every
// product x unit pair -- only exceptions (explicit "mark unavailable" actions in Phase 4).
export const productAvailability = pgTable('product_availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  unitId: uuid('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('product_availability_product_unit_unique').on(table.productId, table.unitId),
  index('idx_product_availability_product_id').on(table.productId),
  index('idx_product_availability_unit_id').on(table.unitId),
])

// ---------------------------------------------------------------------------
// Drizzle relations() — metadata only, no SQL migration needed.
// Enables db.query.X.findMany({ with: { ... } }) relational API.
// Extended by Phase 3 plans (03-02 units, 03-03 categories/products, 03-04 photos).
// ---------------------------------------------------------------------------
import { relations } from 'drizzle-orm'

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  units: many(units),
  categories: many(categories),
  products: many(products),
}))

export const unitsRelations = relations(units, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [units.restaurantId], references: [restaurants.id] }),
  productAvailability: many(productAvailability),
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [categories.restaurantId], references: [restaurants.id] }),
  products: many(products),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [products.restaurantId], references: [restaurants.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  productAvailability: many(productAvailability),
}))

export const productAvailabilityRelations = relations(productAvailability, ({ one }) => ({
  product: one(products, { fields: [productAvailability.productId], references: [products.id] }),
  unit: one(units, { fields: [productAvailability.unitId], references: [units.id] }),
}))
