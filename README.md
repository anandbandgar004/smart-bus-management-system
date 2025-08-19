# 🚍 Smart Bus Management System (BusAI Navigator)

Smart Bus Management System (**BusAI Navigator**) is a real-time transit management and tracking solution built with **Node.js, Express, MongoDB, Socket.IO, and modern frontend tools**.  
It provides dashboards for both **operators** and **commuters**, powered by **GTFS Realtime APIs** and **AI-based analytics**.

---

## 📌 Features

### 🔹 Operator Dashboard
- Real-time **bus tracking** on an interactive map (Leaflet.js).
- **System analytics** with live delay statistics (Chart.js).
- **AI-powered predictions** for delays, stuck buses, and coverage gaps.
- Critical alerts and live fleet status.

### 🔹 User Dashboard
- Search for a bus by ID and track it in **real-time**.
- View bus speed, delay status, and current location.
- Simple, mobile-friendly UI.

### 🔹 Backend & AI Services
- Fetches **live bus positions** from Delhi GTFS Realtime API.
- Capped to **200 buses per feed** for performance.
- Stores bus data and history in **MongoDB**.
- AI module analyzes:
  - Service coverage gaps  
  - Headway (bus frequency) risks  
  - Stuck buses/possible incidents  

---

## 🛠️ Tech Stack

- **Frontend:** HTML, TailwindCSS, FontAwesome, Chart.js, Leaflet.js, Socket.IO client  
- **Backend:** Node.js, Express.js, Socket.IO, MongoDB, Mongoose  
- **Data:** GTFS Realtime API (Delhi Transport Dept)  
- **AI/Analytics:** Custom service using EWMA smoothing for delays, headway analysis, stuck bus detection  

---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/smart-bus-management.git
cd smart-bus-management

### 2. Install Dependencies
```bash
cd backend
npm install

### 3. Run Dev Server
```bash
npm run dev
