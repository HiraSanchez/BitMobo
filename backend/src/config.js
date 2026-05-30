const path = require("path");

const ROOT_DIR = path.join(__dirname, "..", "..");
const BACKEND_DIR = path.join(ROOT_DIR, "backend");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = path.join(BACKEND_DIR, "data");

module.exports = {
  PORT: Number(process.env.PORT || 3000),
  VERIFY_TOKEN: process.env.VERIFY_TOKEN || "chatbox-token",
  ADMIN_USER: process.env.ADMIN_USER || "admin",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "1234",
  ADMIN_SESSION: process.env.ADMIN_SESSION || "chatbox-admin-session",
  PUBLIC_DIR,
  DATA_DIR,
  DB_FILE: path.join(DATA_DIR, "db.json"),
  SQLITE_FILE: path.join(DATA_DIR, "chatbox.sqlite"),
  CATALOG_FILE: path.join(DATA_DIR, "catalog.json"),
  ORDERS_FILE: path.join(DATA_DIR, "orders.json"),
  LOG_FILE: path.join(DATA_DIR, "events.log")
};
