# Project Documentation

## Content

- [First steps](#first-steps)
- [Docker Setup](#docker-setup)
- [Database Migrations](#database-migrations)
- [Database Seeding](#database-seeding)
- [Adding a New Endpoint](#adding-a-new-endpoint)
- [Working with Environment Variables](#working-with-environment-variables)

---

## First Steps

Follow these steps to set up and run the application:

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. **Build Docker containers**:

   ```bash
   docker compose build
   ```

3. **Start Docker containers**:

   ```bash
   docker compose up
   ```

4. **Set up environment variables: Copy .env.example into .env**:

   ```bash
   cp .env.example .env
   ```

5. **Run database migrations**:

   ```bash
   npm run migration:run
   ```

6. **Seed the database**:

   ```bash
   npm run seed
   ```

7. **Run the development server**:

   ```bash
   npm run dev
   ```

8. **Access the application**:
   Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

---

## Docker Setup

### Introduction

This project leverages Docker for creating isolated environments for development. Docker enables seamless development and deployment by standardizing the application setup, ensuring consistency across different environments.

### Requirements

- Docker: Version 20.10+
- Docker Compose: Version 1.29+

### Containers

- Postgres
- Redis

### Commands

#### **Build**

```bash
docker compose build
```

#### **Run**

```bash
docker compose up
```

#### **Stop**

```bash
docker compose down
```

---

## Database Migrations

Follow these steps to create, run, or revert migrations:

### 1. Make Changes to Entities

- Update the entity files to reflect the changes you want in the database schema.

### 2. Create a Migration

- Generate the migration:
  ```bash
  npm run migration:generate -n src/database/migrations/kebab-cased-migration-name
  ```

### 3. Run the Migration

- Run the migration:
  ```bash
  npm run migration:run
  ```

### 4. Revert a Migration

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

## Adding a New Endpoint

To add a new endpoint to the project, follow these steps:

1. **Create a DTO (Data Transfer Object)**:

   - Define the structure of the incoming data in the `dtos` folder.
   - Example: If you're adding a new endpoint for `createOrder`, create a file named `create-order.dto.ts`:
     ```typescript
     export class CreateOrderDto {
       readonly productId: string;
       readonly quantity: number;
     }
     ```

2. **Add a new entity or update an existing one**:

   - If the endpoint requires a new database entity, create it in the `entities` folder.
   - Example: Add `order.entity.ts`:

     ```typescript
     import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

     @Entity('orders')
     export class Order {
       @PrimaryGeneratedColumn()
       id: number;

       @Column()
       productId: string;

       @Column()
       quantity: number;
     }
     ```

3. **Update or create a repository**:

   - Add repository logic in the `repositories` folder. Example: Add `order.repository.ts`:

     ```typescript
     import dataSource from '@database/config/typeorm.config';
     import { Order } from '@modules/iam/entities/order.entity';

     export const orderRepository = dataSource.getRepository(Order);
     export const createOrder = async (
       order: Partial<Order>,
     ): Promise<Order> => {
       const newOrder = orderRepository.create(order);
       return await orderRepository.save(newOrder);
     };
     ```

4. **Add business logic in the service layer**:

   - Add the core business logic in the `services` folder. Example: Add `order.service.ts`:

     ```typescript
     import { CreateOrderDto } from '@modules/iam/dtos/create-order.dto';
     import { createOrder } from '@modules/iam/repositories/order.repository';

     export const createNewOrder = async (dto: CreateOrderDto) => {
       return await createOrder(dto);
     };
     ```

5. **Add a controller**:

   - Define the route handler in the `controllers` folder. Example: Add `order.controller.ts`:

     ```typescript
     import { Request, Response } from 'express';
     import { CreateOrderDto } from '@modules/iam/dtos/create-order.dto';
     import { createNewOrder } from '@modules/iam/services/order.service';

     export const createOrder = async (
       req: Request,
       res: Response,
     ): Promise<void> => {
       const dto: CreateOrderDto = req.body;
       const result = await createNewOrder(dto);
       res.status(201).json(result);
     };
     ```

6. **Add the route**:

   - Register the new endpoint in the `routes` folder. Example: Add `order.routes.ts`:

     ```typescript
     import { Router } from 'express';
     import { createOrder } from '@modules/iam/controllers/order.controller';
     import { validation } from '@middleware/validation.middleware';

     const router = Router();

     router.post('/order', validation(CreateOrderDto), createOrder);

     export default router;
     ```

7. **Register the route in the main module**:

   - Update the `index.ts` file to include the new route:

     ```typescript
     import orderRoutes from './routes/order.routes';

     export { orderRoutes };
     ```

   - Update the `app.ts` file to register the new route:
     ```typescript
     import { orderRoutes } from '@modules/iam';
     app.use('/order', orderRoutes);
     ```

8. **Test the endpoint**:
   - Add unit and integration tests for your new logic in the appropriate test folders (`tests/unit` and `tests/integration`).

By following this structure, you ensure consistency, maintainability, and scalability across the project.

---

## Working with Environment Variables

This project relies on specific environment variables to ensure proper configuration across different environments (e.g., `development`, `test`, `production`). The `getEnvVariable` utility function is used to securely fetch and validate required environment variables.

### Environment Variables Validation

The application requires different sets of environment variables based on the current `NODE_ENV`. If a required environment variable is missing, the application will throw a `MissingEnvError` with the name of the missing variable.

To ensure proper validation, **all required environment variables must be explicitly defined in the `requiredEnvVariables` object within the `getEnvVariable` utility function**. This object is the source of truth for variable requirements across all environments.

### Using the Utility Function

The `getEnvVariable` function is used to retrieve environment variables. It automatically validates whether the variable is required for the current `NODE_ENV` and throws an error if it is missing. Example usage:

```typescript
import getEnvVariable from './path/to/getEnvVariable';

const dbHost = getEnvVariable('DB_HOST');
const jwtSecret = getEnvVariable('JWT_SECRET');
```

### Defining Required Variables

To add a new required environment variable, update the `requiredEnvVariables` object in the utility function. For example:

```typescript
const requiredEnvVariables: Record<string, string[]> = {
  common: [
    // Add your new variable here if required in all environments
    'NEW_COMMON_VARIABLE',
  ],
  development: [
    // Add your new variable here if required only in development
    'NEW_DEV_VARIABLE',
  ],
  test: [
    // Add your new variable here if required only in test
    'NEW_TEST_VARIABLE',
  ],
  production: [
    // Add your new variable here if required only in production
    'NEW_PROD_VARIABLE',
  ],
};
```
