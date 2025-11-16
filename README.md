# Backend Service Documentation

## Overview

This project is a comprehensive Node.js backend service built using Express, providing a modular REST API architecture with controllers, routes, helpers, and utilities. It supports multiple domain modules including authentication, news, articles, nodes, events, coordinates, providers, edges, and points of interest.

The system follows a layered architecture and uses various middleware tools such as Multer for file uploads and custom error handling.

---

## Features

* Modular REST API (v1) architecture
* Authentication (JWT)
* CRUD operations for multiple domain entities
* File upload support (Multer)
* Centralized error handling
* Hyperbase integration utilities
* Helper utilities for responses and verification codes

---

## Tech Stack

* **Node.js**
* **Express.js**
* **Multer** (file uploading)
* **JSON Web Token** (authentication)
* **Custom Error Handler**

---

## Project Structure

```
src/
├── controllers/
│   ├── example.controller.js
│   └── v1/
│       ├── articles.controller.js
│       ├── auth.controller.js
│       ├── coordinate.controller.js
│       ├── edges.controller.js
│       ├── events.controller.js
│       ├── news.controller.js
│       ├── nodes.controller.js
│       ├── point_of_interest.controller.js
│       ├── provider.controller.js
│       └── temples.controller.js
│
├── helpers/
│   ├── customError.js
│   ├── generateVerificationCode.js
│   ├── multer.js
│   └── response.js
│
├── routes/
│   ├── example.route.js
│   └── v1/
│       ├── auth.routes.js
│       ├── coordinate.routes.js
│       ├── events.routes.js
│       ├── index.js
│       ├── news.routes.js
│       ├── nodes.routes.js
│       ├── provider.routes.js
│       └── edges.routes.js
│       └── point_of_interest.routes.js
│       └── temples.routes.js
│
├── utils/
│   └── hyperbase.js
│
└── app.js
```

---

## Installation

```bash
git clone https://github.com/inamnurulf/borobudur-backend-service
cd borobudur-backend-service
npm install
```

---

## Environment Variables

Create a `.env` file and include environment variables such as:

```
PORT=3000
JWT_SECRET=your_secret_key
DB_HOST=...
DB_USER=...
DB_PASSWORD=...
```

---

## Running the Server

### Development Mode

```
npm run dev
```

### Production

```
npm start
```

---

## System Architecture

```
Client → Express REST API → Controllers → Services/Helpers → Database/Hyperbase
```

---

## API Routes (v1)

Below is a consolidated list of available API endpoints.

### Authentication

| Method | Endpoint              | Description   |
| ------ | --------------------- | ------------- |
| POST   | /api/v1/auth/login    | Login user    |
| POST   | /api/v1/auth/register | Register user |
| POST   | /api/v1/auth/verify   | Verify user   |

### News

| Method | Endpoint         |
| ------ | ---------------- |
| GET    | /api/v1/news     |
| POST   | /api/v1/news     |
| GET    | /api/v1/news/:id |
| PUT    | /api/v1/news/:id |
| DELETE | /api/v1/news/:id |

### Articles

| Method | Endpoint             |
| ------ | -------------------- |
| GET    | /api/v1/articles     |
| POST   | /api/v1/articles     |
| GET    | /api/v1/articles/:id |
| PUT    | /api/v1/articles/:id |
| DELETE | /api/v1/articles/:id |

### Nodes

| Method | Endpoint          |
| ------ | ----------------- |
| GET    | /api/v1/nodes     |
| POST   | /api/v1/nodes     |
| GET    | /api/v1/nodes/:id |
| PUT    | /api/v1/nodes/:id |
| DELETE | /api/v1/nodes/:id |

### Coordinates

| Method | Endpoint            |
| ------ | ------------------- |
| GET    | /api/v1/coordinates |
| POST   | /api/v1/coordinates |

### Providers

| Method | Endpoint          |
| ------ | ----------------- |
| GET    | /api/v1/providers |
| POST   | /api/v1/providers |

### Events

| Method | Endpoint       |
| ------ | -------------- |
| GET    | /api/v1/events |
| POST   | /api/v1/events |

### Edges

| Method | Endpoint          |
| ------ | ----------------- |
| GET    | /api/v1/edges     |
| POST   | /api/v1/edges     |
| GET    | /api/v1/edges/:id |

### Point of Interest

| Method | Endpoint        |
| ------ | --------------- |
| GET    | /api/v1/poi     |
| POST   | /api/v1/poi     |
| GET    | /api/v1/poi/:id |

### Temples

| Method | Endpoint            |
| ------ | ------------------- |
| GET    | /api/v1/temples     |
| POST   | /api/v1/temples     |
| GET    | /api/v1/temples/:id |

---

## Error Handling

This project uses **customError.js** to standardize API error outputs.

Example output:

```json
{
  "status": "error",
  "message": "Invalid token"
}
```

---

## File Uploads

Multer is configured in `helpers/multer.js`.

Usage example:

```javascript
upload.single("image")
```

---

## Utilities

### Hyperbase Integration

Located in:

```
src/utils/hyperbase.js
```

Handles communication with Hyperbase backend services.

---

## Future Improvements

* Add Swagger API documentation
* Add unit & integration tests
* Add Docker deployment
* Implement caching layer (Redis)

---


