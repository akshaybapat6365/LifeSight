-- Create tables based on the schema.ts file

-- User table
CREATE TABLE IF NOT EXISTS "User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  email VARCHAR(64) NOT NULL,
  password VARCHAR(64)
);

-- Chat table
CREATE TABLE IF NOT EXISTS "Chat" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" TIMESTAMP NOT NULL,
  messages JSONB NOT NULL,
  "userId" UUID NOT NULL REFERENCES "User"(id)
);

-- Reservation table
CREATE TABLE IF NOT EXISTS "Reservation" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" TIMESTAMP NOT NULL,
  details JSONB NOT NULL,
  "hasCompletedPayment" BOOLEAN NOT NULL DEFAULT false,
  "userId" UUID NOT NULL REFERENCES "User"(id)
);

-- Since we're using Drizzle ORM, these tables align with the schema defined in db/schema.ts 