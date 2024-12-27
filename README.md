# Project Documentation

## Content

- [Docker Setup](#docker-setup)

---

## Docker Setup

### Introduction

This project leverages Docker for creating isolated environments for both development and production. Docker enables seamless development and deployment by standardizing the application setup, ensuring consistency across different environments.

### Requirements

- Docker: Version 20.10+
- Docker Compose: Version 1.29+

### Description

The Docker setup is divided into four stages:
1. **Base setup**: Shared configurations and dependencies.
2. **Development setup**: Includes features like hot reload for active development.
3. **Production build**: Compiles the project into a production-ready state.
4. **Production setup**: Minimal image optimized for running the production build.

The setup also includes separate Docker Compose files for development and production environments.

### Key Features

1. **Development**:
   - Hot reload enabled using `develop.watch`.
   - Access the app at [http://localhost:3000](http://localhost:3000).

2. **Production**:
   - Optimized for performance.
   - Access the app at [http://localhost:3000](http://localhost:3000).

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
