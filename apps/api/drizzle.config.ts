import type { Config } from "drizzle-kit";

export default {
  schema: "./build/database/schema/*.js",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!
  },
  extensionsFilters: ["postgis"],
} satisfies Config;
