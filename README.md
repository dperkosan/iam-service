# Project Documentation

## Content

- [Description](#description)
- [First steps](#first-steps)
- [Docker Setup](#docker-setup)
- [Database Migrations](#database-migrations)
- [Database Seeding](#database-seeding)
- [Adding a New Endpoint](#adding-a-new-endpoint)
- [Working with Environment Variables](#working-with-environment-variables)
- [Error Handling](#error-handling)

---

## Description

This project is an **IAM (Identity and Access Management) Service** built with **Node.js**, **Express**, **PostgreSQL**, **Redis**, and **Docker**. It is designed to handle **user authentication, account verification, password management, and role-based access control (RBAC)**. The service provides secure access management, token validation, and token invalidation features.

Key components of the system:

- **Node.js + Express** – Backend framework.
- **PostgreSQL** – Relational database.
- **Redis** – Used to validate and invalidate tokens (e.g., logout, refresh token invalidation).
- **Docker** – Containerization for easy setup and deployment.
- **TypeORM** – Database ORM for managing entities, migrations, and seeding.
- **Unit & Integration Testing** – Ensuring reliability of individual units and the system as a whole.
- **Logging** – Structured application logging with appropriate error handling.

### Routes Overview

#### `/auth` – **Authentication & Account Management**

| Route                               | Method | Description                                                  |
| ----------------------------------- | ------ | ------------------------------------------------------------ |
| `/auth/register`                    | POST   | Register a new user account.                                 |
| `/auth/resend-verify-account-email` | POST   | Resend the account verification email to a user.             |
| `/auth/send-verify-account-email`   | POST   | Send the initial verification email.                         |
| `/auth/verify-account`              | PATCH  | Verify a user’s account using a token (e.g., from an email). |
| `/auth/login`                       | POST   | Authenticate user and return access + refresh tokens.        |
| `/auth/refresh-token`               | POST   | Obtain a new access token using a refresh token.             |
| `/auth/send-reset-password-email`   | POST   | Send a password reset email to a user.                       |
| `/auth/resend-reset-password-email` | POST   | Resend a password reset email.                               |
| `/auth/reset-password`              | PATCH  | Reset a user's password using a token (e.g., from an email). |

#### `/example` – **Example Protected Routes**

| Route                            | Method | Description                                                  |
| -------------------------------- | ------ | ------------------------------------------------------------ |
| `/example/public-route`          | GET    | Public route – accessible without authentication.            |
| `/example/auth-route`            | GET    | Protected route – requires user authentication.              |
| `/example/auth-route-admin-only` | GET    | Admin-only route – requires authentication and `admin` role. |

### Key Features

- **JWT Authentication with Redis-backed Token Management**:
  - Tokens issued on login.
  - Redis used for **validating tokens** (e.g., refresh token flow) and **invalidating tokens** on logout or security events.
- **Role-Based Access Control (RBAC)**:
  - Middleware to restrict routes to authenticated users and roles like `admin`.
- **Email Verification & Password Reset**:
  - Email-based account activation.
  - Secure password reset process with token validation.
- **Graceful Shutdown**:
  - Ensures proper closure of **database connections** and **Redis client**.
- **Migrations & Seeding**:
  - **TypeORM** for database schema changes.
  - **Seeder scripts** for inserting initial data like user roles.
- **Testing**:
  - **Unit tests** for individual components.
  - **Integration tests** for validating end-to-end behavior.
- **Logging**:
  - Structured application-level logging.
  - Errors are caught with a global error handler for uniform API responses.

## First Steps

Follow these steps to set up and run the application:

1. **Clone the repository**:

   ```bash
   git clone git@github.com:dperkosan/iam-service.git
   cd iam-service
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

5. **Install javascript dependencies**:

   ```bash
   npm install
   ```

6. **Run database migrations**:

   ```bash
   npm run migration:run
   ```

7. **Seed the database**:

   ```bash
   npm run seed
   ```

8. **Run the development server**:

   ```bash
   npm run dev
   ```

9. **Access the application**:
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
- Use the database configuration file located at `src/database/config/typeorm.config.ts`.

### Creating New Seeders

To create a new seeder file, create a factory file within entities folder and update `database/seeds/seed.ts` file.

---

## Adding a New Endpoint

To add a new endpoint to the project, follow these steps:

1. **Add a new entity or update an existing one**:

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

2. **Create a Migration file**:

   - Check: [Database Migrations](#database-migrations)

3. **Create new seeders**:

   - To create a new seeder file, create a factory file within entities folder and update `database/seeds/seed.ts` file.

4. **Create a DTO (Data Transfer Object)**:

   - Define the structure of the incoming data in the `dtos` folder.
   - Example: If you're adding a new endpoint for `createOrder`, create a file named `create-order.dto.ts`:
     ```typescript
     export class CreateOrderDto {
       readonly productId: string;
       readonly quantity: number;
     }
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

6. **Add business logic in the service layer**:

   - Add the core business logic in the `services` folder. Example: Add `order.service.ts`:

     ```typescript
     import { CreateOrderDto } from '@modules/iam/dtos/create-order.dto';
     import { createOrder } from '@modules/iam/repositories/order.repository';

     export const createNewOrder = async (dto: CreateOrderDto) => {
       return await createOrder(dto);
     };
     ```

7. **Update or create a repository**:

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

8. **Add the route**:

   - Register the new endpoint in the `routes` folder. Example: Add `order.routes.ts`:

     ```typescript
     import { Router } from 'express';
     import { createOrder } from '@modules/iam/controllers/order.controller';
     import { validation } from '@middleware/validation.middleware';

     const router = Router();

     router.post('/order', validation(CreateOrderDto), createOrder);

     export default router;
     ```

9. **Register the route in the main module**:

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

10. **Test the endpoint**:

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

## Error Handling

This project implements a robust error-handling mechanism to ensure the application is reliable, secure, and user-friendly. Below are the key components of the error-handling system:

---

#### **1. Custom Error Classes**

The `http-status.error.ts` file defines custom error classes to represent specific types of errors. These classes extend the base `AppError` class, which encapsulates common properties such as `statusCode` and `isOperational`.

**Key Error Classes:**

- `AppError`: The base class for all application errors.
- `BadRequestError`: Represents HTTP 400 (Bad Request) errors.
- `NotFoundError`: Represents HTTP 404 (Not Found) errors.
- `UnauthorizedError`: Represents HTTP 401 (Unauthorized) errors.
- `ForbiddenError`: Represents HTTP 403 (Forbidden) errors.
- `ValidationError`: Represents validation errors, with an array of error messages.
- `MissingEnvError`: Indicates missing or undefined environment variables.

**Example:**

```typescript
throw new BadRequestError('Invalid input data');
```

---

#### **2. Middleware for Global Error Handling**

The `error.middleware.ts` file provides middleware to handle errors globally across the application.

**Key Features:**

- **Operational Errors:** Errors of type `AppError` are treated as expected errors. The error details are logged, and an appropriate response is sent to the client.
- **Unhandled Errors:** Other errors are treated as unexpected issues, logged, and responded to with a generic error message.

**Implementation:**

```typescript
export const errorHandler = (
  err: AppError | Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      status: 'error',
      isOperational: err.isOperational,
    });
  } else {
    res.status(500).json({ message: 'Internal Server Error', status: 'error' });
  }
};
```

---

#### **3. Route-Specific Error Handling**

To handle asynchronous errors in route handlers, a helper function `handleRouteErrors` wraps each route, ensuring any uncaught errors are passed to the error-handling middleware.

**Example Usage:**

```typescript
router.post('/register', validation(RegisterDto), handleRouteErrors(register));
```

---

#### **4. Service-Level Error Management**

Service functions are designed to handle operational errors explicitly. When an error occurs:

- It is logged with detailed information for debugging.
- Known errors (e.g., validation issues) are re-thrown as `AppError` instances.
- Unexpected errors are caught and re-thrown as generic `AppError` instances.

**Example:**

```typescript
try {
  const result = await dataSource.transaction(async (transactionManager) => {
    // Logic
  });
  return result;
} catch (error) {
  throw new AppError('Service Error: Failed to register user', 500);
}
```

---

#### **5. Repository Error Handling**

Repository methods catch and handle database-specific errors. For instance:

- `isQueryFailedErrorWithCode` detects query errors.
- Duplicate entries are translated into `BadRequestError` with clear messaging.

**Example:**

```typescript
if (isQueryFailedErrorWithCode(error) && error.code === '23505') {
  throw new BadRequestError('Email already exists');
}
```

---

#### **6. Logging**

All errors, whether operational or unexpected, are logged using the custom logging utility. Logs contain details such as the error message, stack trace, and type.

---

#### **7. Development vs. Production**

- **Development Mode:** Includes stack traces in error responses for easier debugging.
- **Production Mode:** Excludes sensitive details from error responses to enhance security.

**Example:**

```typescript
...(getEnvVariable('NODE_ENV') === 'development' && { stack: err.stack })
```

---

### Benefits of This Approach

- **Centralized Handling:** A single middleware processes all errors.
- **Consistency:** Custom error classes ensure uniform error structures.
- **Scalability:** Easy to add new error types as needed.
- **Security:** Detailed error information is exposed only in development mode.
- **Reliability:** Prevents application crashes from unhandled errors.

This structured approach ensures the application remains maintainable, secure, and user-friendly while simplifying debugging and issue resolution.
