import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const raw = process.env.DATABASE_URL;
if (!raw) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

const url = new URL(raw);
// TiDB Cloud는 TLS 필수 → 연결 주소에 ssl 옵션을 붙여서 넘김
if (url.hostname.includes("tidbcloud.com") && !url.searchParams.has("ssl")) {
  url.searchParams.set(
    "ssl",
    JSON.stringify({ minVersion: "TLSv1.2", rejectUnauthorized: true })
  );
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: { url: url.toString() },
});