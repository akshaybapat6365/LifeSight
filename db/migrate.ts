import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({
  path: ".env", // Load from .env instead of .env.local
});

const runMigrate = async () => {
  // Use DATABASE_URL instead of POSTGRES_URL
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env file");
  }

  // Use DATABASE_URL instead of POSTGRES_URL
  const connection = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(connection);

  console.log("⏳ Running migrations...");

  const start = Date.now();
  await migrate(db, { migrationsFolder: "./lib/drizzle" });
  const end = Date.now();

  console.log("✅ Migrations completed in", end - start, "ms");
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});
