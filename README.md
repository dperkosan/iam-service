# Project Documentation

## Content

- [Docker Setup](#docker-setup)
- [Database Migrations](#database-migrations)
- [Database Seeding](#database-seeding)

---

## Docker Setup

### Introduction

This project leverages Docker for creating isolated environments for development. Docker enables seamless development and deployment by standardizing the application setup, ensuring consistency across different environments.

### Requirements

- Docker: Version 20.10+
- Docker Compose: Version 1.29+

### Key Features

- Hot reload enabled using `develop.watch`.
- Access the app at [http://localhost:3000](http://localhost:3000).

---

## Commands

### **Build**

```bash
docker compose -f docker-compose.yml build
```

### **Run**

```bash
docker compose -f docker-compose.yml up --watch
```

### **Stop**

```bash
docker compose -f docker-compose.yml down
```

---

## Database Migrations

Follow these steps to create, run, or revert migrations:

### 1. Make Changes to Entities

- Update the entity files to reflect the changes you want in the database schema.

### 2. Create a Migration

- Build the project:
  ```bash
  npm run build
  ```
- Generate the migration:
  ```bash
  npm run migration:generate -n src/database/migrations/kebab-cased-migration-name
  ```

### 3. Run the Migration

- Build the project:
  ```bash
  npm run build
  ```
- Run the migration:
  ```bash
  npm run migration:run
  ```

### 4. Revert a Migration

- Build the project:
  ```bash
  npm run build
  ```
- Revert the migration:
  ```bash
  npm run migration:revert
  ```

---

## Database Seeding

The seeding process is used to populate the database with initial data or generate data using factories. Follow the steps below to run the seeders.

### Prerequisites

Ensure the following are set up before running the seeders:

1. **Database connection:** Confirm that your database is running and accessible within docker.
2. **Compiled files:** Ensure your project is compiled. Use:
   ```bash
   npm run build
   ```

### Running Seeders

To seed the database, use the following command:

```bash
npm run seed
```

This command will:

- Delete all existing data from the DB
- Execute the `seed:run` command from the `typeorm-extension` package.
- Use the database configuration file located at `dist/database/config/typeorm.config`.

### Creating New Seeders

To create a new seeder file, create a factory file within entities folder and update `database/seeds/seed.ts` file.

---
