# Expense AI 🤖💰

AI-powered Personal Finance Tracker built with React and FastAPI. Features automatic transaction logging via Gemini AI, beautiful cash flow analytics, a secure multi-user authentication system, and Progressive Web App (PWA) support.

![Preview](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

- **🤖 AI-Powered Data Entry**: Automatically extracts transaction details (Amount, Category, Date) from natural language inputs using Google's Gemini AI.
- **📱 Progressive Web App (PWA)**: Installable on Android, iOS, Windows, and Mac for a native app-like experience.
- **🔐 Secure Authentication**: Multi-user support with JWT-based authentication and Bcrypt password hashing.
- **📊 Cash Flow Analytics**: Beautiful and interactive charts to visualize your income, expenses, and savings targets.
- **☁️ Cloud Database**: Powered by Supabase (PostgreSQL) for reliable and scalable data storage.
- **🚀 Vercel Deployment**: Fully configured for seamless serverless deployment on Vercel.

---

## 🛠️ Tech Stack

### Frontend
- **React (Vite)**
- **Axios** (API Requests)
- **React Router DOM** (Routing)
- **Vite PWA Plugin** (Progressive Web App configuration)

### Backend
- **FastAPI** (Python web framework)
- **SQLAlchemy** (ORM)
- **PostgreSQL / Supabase** (Database)
- **Google Generative AI SDK** (Gemini AI integration)
- **Bcrypt & Python-Jose** (Security and JWT Auth)

---

## 🚀 Quick Start (Local Development)

### 1. Clone the Repository
```bash
git clone https://github.com/ramadanrahmad/expense-tracker.git
cd expense-tracker
```

### 2. Setup Backend
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the `backend` folder:
```env
DATABASE_URL=postgresql://user:password@aws-0-region.pooler.supabase.com:6543/postgres
GEMINI_API_KEY=your_google_gemini_api_key
SECRET_KEY=your_super_secret_jwt_key
```

Run the FastAPI server:
```bash
python -m uvicorn main:app --reload
```

### 3. Setup Frontend
Open a new terminal and navigate to the frontend folder:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` folder:
```env
VITE_API_URL=http://localhost:8000
```

Start the Vite development server:
```bash
npm run dev
```

---

## ☁️ Deployment

This project is configured to be deployed on [Vercel](https://vercel.com).
- The `frontend/vercel.json` file handles SPA routing (preventing 404s on page refresh).
- The `backend/vercel.json` file configures the FastAPI serverless deployment.

*Note: When deploying to Vercel, ensure that **Vercel Authentication is disabled** in your project settings so that the frontend can successfully communicate with the backend API.*

---

## 📄 License
This project is licensed under the MIT License.
