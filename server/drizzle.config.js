require('dotenv').config();

/** @type { import("drizzle-kit").Config } */
module.exports = {
  schema: "./db/schema.js",
  out: "./db/migrations",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || "lofiuser",
    password: process.env.DB_PASSWORD || "lofipass123",
    database: process.env.DB_NAME || "lofitoapp",
  },
};
