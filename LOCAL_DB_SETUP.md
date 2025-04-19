# Local Database Setup Guide

This guide will help you set up a local PostgreSQL database for the LifeSight project.

## Prerequisites

- Docker Desktop installed
- Node.js and npm/pnpm installed

## Setting Up PostgreSQL with Docker

1. Start Docker Desktop

2. Run the PostgreSQL container:
```bash
docker run --name lifesight-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_USER=postgres -e POSTGRES_DB=lifesight -p 5432:5432 -d postgres:14
```

3. Verify the container is running:
```bash
docker ps
```

## Database Configuration

1. Create a `.env.local` file in the project root with the following content:
```
DATABASE_URL=postgres://postgres:password@localhost:5432/lifesight
NODE_ENV=development
```

2. Make sure `.env.local` is in your `.gitignore` to prevent committing secrets

## Initialize Database Schema

The schema is set up using Drizzle ORM. Run the migration:

```bash
npx drizzle-kit push:pg
```

## Test the Connection

Run the test script to verify your connection:

```bash
node test_db_connection.js
```

You should see output confirming your connection and listing the tables.

## Available SQL Files

The following SQL files are available for reference:

- `create_tables.sql` - Creates the database tables
- `insert_sample_data.sql` - Inserts sample data
- `example_queries.sql` - Contains example queries to run against the database

## Running SQL Scripts

To run SQL scripts on your PostgreSQL container:

```bash
# Copy SQL file to container
docker cp create_tables.sql lifesight-postgres:/create_tables.sql

# Execute SQL file
docker exec lifesight-postgres psql -U postgres -d lifesight -f /create_tables.sql
```

## Common PostgreSQL Commands

Access the PostgreSQL command line:
```bash
docker exec -it lifesight-postgres psql -U postgres -d lifesight
```

PostgreSQL commands:
- `\dt` - List tables
- `\d "User"` - Show table structure
- `\q` - Quit psql

## Troubleshooting

If you encounter connection issues:
1. Ensure Docker is running
2. Check that the container is running with `docker ps`
3. Verify your connection string in `.env.local`
4. Try restarting the container: `docker restart lifesight-postgres`

## Database Schema

The database contains the following tables:

1. **User**
   - id (UUID, Primary Key)
   - email (VARCHAR)
   - password (VARCHAR)

2. **Chat**
   - id (UUID, Primary Key)
   - createdAt (TIMESTAMP)
   - messages (JSONB)
   - userId (UUID, Foreign Key to User)

3. **Reservation**
   - id (UUID, Primary Key)
   - createdAt (TIMESTAMP)
   - details (JSONB)
   - hasCompletedPayment (BOOLEAN)
   - userId (UUID, Foreign Key to User) 