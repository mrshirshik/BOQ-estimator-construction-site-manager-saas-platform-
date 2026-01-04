import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required by Supabase
});

async function testConnection() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ Database connected successfully!");
    console.log("⏰ Current time from DB:", res.rows[0]);
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  } finally {
    await pool.end();
  }
}

testConnection();
