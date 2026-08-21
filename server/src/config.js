import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  databaseUrl:
    process.env.DATABASE_URL || "postgres://postgres:12345@localhost:5432/school_of_faith",
  jwtSecret: process.env.JWT_SECRET || "development-secret",
  clientUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173",
};
