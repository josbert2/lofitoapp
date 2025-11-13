const {
  mysqlTable,
  varchar,
  text,
  timestamp,
  boolean,
  int,
  json,
  mysqlEnum,
} = require("drizzle-orm/mysql-core");
const { relations } = require("drizzle-orm");

// Import Better Auth tables
const authSchema = require("./auth-schema");

// Re-export Better Auth tables
module.exports.user = authSchema.user;
module.exports.session = authSchema.session;
module.exports.account = authSchema.account;
module.exports.verification = authSchema.verification;

// Templates table - Configuraciones guardadas de Lofi (mood, scene, effects)
const templates = mysqlTable("templates", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => authSchema.user.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  setId: varchar("set_id", { length: 255 }).notNull(), // ID del set visual
  sceneIndex: int("scene_index").notNull(), // Índice de la escena
  level: int("level").default(50), // Nivel de audio general
  effects: json("effects").notNull(), // Array de efectos ambientales [{type, name, level, active}]
  sceneEffect: text("scene_effect"), // Efecto de escena
  mood: varchar("mood", { length: 50 }).notNull(), // chill, jazzy, sleepy
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  modifiedAt: timestamp("modified_at").defaultNow().onUpdateNow().notNull(),
});

// User settings table (custom for Lofitoapp)
const userSettings = mysqlTable("user_settings", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => authSchema.user.id, { onDelete: "cascade" }),
  theme: varchar("theme", { length: 50 }).default("default"),
  volume: int("volume").default(50),
  autoplay: boolean("autoplay").default(true),
  preferences: json("preferences"),
  modifiedAt: timestamp("modified_at").defaultNow().onUpdateNow().notNull(),
});

// Relations
const userRelations = relations(authSchema.user, ({ many, one }) => ({
  templates: many(templates),
  sessions: many(authSchema.session),
  accounts: many(authSchema.account),
  settings: one(userSettings, {
    fields: [authSchema.user.id],
    references: [userSettings.userId],
  }),
}));

const templatesRelations = relations(templates, ({ one }) => ({
  user: one(authSchema.user, {
    fields: [templates.userId],
    references: [authSchema.user.id],
  }),
}));

const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(authSchema.user, {
    fields: [userSettings.userId],
    references: [authSchema.user.id],
  }),
}));

module.exports = {
  ...authSchema,
  templates,
  userSettings,
  userRelations,
  templatesRelations,
  userSettingsRelations,
};
