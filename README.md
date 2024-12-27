# Docker Setup

This project uses Docker for both **development** and **production** environments.

## Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (part of Docker CLI)

---

## Commands

### **Build**

- **Development**:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml build
  ```

- **Production**:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.prod.yml build
  ```

### **Run**

- **Development**:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml up --watch
  ```

- **Production**:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
  ```

### **Stop**

- **Development**:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml down
  ```

- **Production**:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.prod.yml down
  ```

---

## Key Features

1. **Development**:
   - Hot reload enabled using `develop.watch`.
   - Access the app at [http://localhost:3000](http://localhost:3000).

2. **Production**:
   - Optimized for performance.
   - Access the app at [http://localhost:3000](http://localhost:3000).
