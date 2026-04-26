# Redis SSE Real-Time Notification System 🚀

A backend-focused real-time communication project that uses **Redis Pub/Sub** and **Server-Sent Events (SSE)** to deliver live notifications from the server to connected clients.

This project demonstrates how Redis can be used as a message broker for scalable event-driven communication while SSE enables real-time updates from server to browser clients.

---

## Project Overview

Traditional applications often rely on repeated API polling to check for updates, which increases server load and delays communication.

This project solves that problem by implementing:

- **Redis Pub/Sub** → handles event publishing and message distribution
- **Server-Sent Events (SSE)** → streams real-time updates from server to clients
- **Node.js backend** → manages communication flow
- **Event-driven architecture** → improves scalability and performance

When an event is published to Redis, all connected SSE clients instantly receive updates without refreshing the page.

---

## Features

✅ Real-time notification delivery  
✅ Redis Pub/Sub messaging  
✅ Server-Sent Events integration  
✅ Persistent client connection  
✅ Low-latency event broadcasting  
✅ Scalable backend communication  
✅ Event streaming architecture  
✅ Lightweight real-time alternative to WebSockets  
✅ Error handling implementation  

---

## Tech Stack

### Backend
- :contentReference[oaicite:0]{index=0}
- :contentReference[oaicite:1]{index=1}

### Messaging System
- :contentReference[oaicite:2]{index=2} Pub/Sub

### Communication
- Server-Sent Events (SSE)

### Tools
- Git
- GitHub
- Postman
- VS Code

---

## How It Works

### Step 1: Client Connects
The client establishes an SSE connection with the server.

```bash
GET /events
