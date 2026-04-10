import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── 修改建議留言板 ───────────────────────────────────────────────────────────
export const feedbacks = mysqlTable("feedbacks", {
  id: int("id").autoincrement().primaryKey(),
  /** 留言者暱稱（匿名可填「匿名用戶」） */
  nickname: varchar("nickname", { length: 50 }).notNull(),
  /** 建議類型：功能需求 / 介面改善 / Bug 回報 / 其他 */
  category: mysqlEnum("category", ["feature", "ui", "bug", "other"]).notNull().default("feature"),
  /** 建議內容 */
  content: text("content").notNull(),
  /** 管理員回覆 */
  adminReply: text("adminReply"),
  /** 狀態：待處理 / 處理中 / 已完成 / 已關閉 */
  status: mysqlEnum("status", ["pending", "inprogress", "done", "closed"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Feedback = typeof feedbacks.$inferSelect;
export type InsertFeedback = typeof feedbacks.$inferInsert;
