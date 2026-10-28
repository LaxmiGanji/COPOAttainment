# CO-PO Attainment Calculation System

Outcome-Based Education (OBE) platform for Course Outcome (CO) and Program Outcome (PO) attainment calculations, question mapping, and dynamic assessment sheet generation.

## Prerequisites

Before running the application, make sure you have the following installed:

- **Java JDK 21+**
- **Apache Maven 3.9+**
- **Node.js 18+ & npm**
- **MongoDB** running locally on port `27017`

---

## 1. Database Setup

Ensure MongoDB is running locally:

```bash
# Verify MongoDB service is active on localhost:27017
mongosh --eval "db.adminCommand('ping')"
```

The database `copo_db` will be initialized automatically on the first backend run.

---

## 2. Backend Setup (Spring Boot)

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Build and run the Spring Boot application:
   ```bash
   mvn clean spring-boot:run
   ```

The backend API server will start at `http://localhost:8080`.

---

## 3. Frontend Setup (Next.js)

1. Open another terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

The frontend application will be live at `http://localhost:3000`.

---


## Key Features

- **Step 1: Course Setup & Weightages**: Configure course details, syllabus, credits, and target thresholds.
- **Step 2: CO-PO Correlation Matrix**: Map Course Outcomes to PO1-PO12 and PSO1-PSO2 with weights (1-3).
- **Step 3: Question-to-CO Mapping & Choices**: Configure questions, mandatory status, internal choices (OR), and test rules with live simulation.
- **Step 4: Assessment Sheet**: Dynamic Excel-like matrix with automated student marks entry, backend calculations, and instant database persistence.
- **Step 5: Attainment Dashboard**: Visual attainment reports and direct/indirect attainment level summaries.
