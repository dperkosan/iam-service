# Project Documentation

## Content

- [Docker Setup](#docker-setup)

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
