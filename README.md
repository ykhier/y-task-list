# 📅 WeekFlow – Full-Stack Weekly Planner

🌐 **Live Demo:** https://y-task-list.vercel.app/

WeekFlow is a full-stack web application for managing weekly schedules, tasks, and recurring events.  
It combines calendar planning, task management, and AI-powered features in a single responsive platform.

---

## ✨ Features
- 📆 Weekly calendar with drag & drop  
- ✅ Task management with automatic calendar integration  
- 🔁 Recurring tasks and scheduling  
- 🔐 User login system with admin access and OTP verification for admins  
- 🎙️ Voice input using AI (OpenAI) for task and event creation  
- ⚡ Real-time data synchronization with Supabase  
- 📱 Fully responsive design (mobile & desktop) with RTL support  

---

## 🛠️ Tech Stack
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS  
- **Backend / DB:** Supabase, PostgreSQL  
- **Realtime:** Supabase Realtime  
- **AI:** OpenAI API  
- **Auth:** Supabase Auth (with admin OTP)  
- **Deployment:** Vercel  
- **Version Control:** Git & GitHub  

---

## 📥 Getting Started

### 1. Clone the repository
git clone https://github.com/your-username/weekflow.git  
cd weekflow  

### 2. Install dependencies
npm install  

### 3. Setup environment variables
Create a `.env.local` file based on `.env.local.example`  

### 4. Run the development server
npm run dev  

---

## 📂 Project Structure
app/ – main application  
components/ – UI components  
hooks/ – logic and data handling  
lib/ – utilities  
supabase/ – database schema  
types/ – types  

---

## 📌 Notes
- Supabase Realtime must be enabled  
- OTP verification is for admin users  
- Voice input requires OpenAI API  

---

## 👨‍💻 Author
Yosef Khier
