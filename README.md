# 🎵 VibeStream

VibeStream is a premium, high-performance music streaming platform designed for a seamless and distraction-free experience. It features a hybrid architecture combining a React-based frontend with an Express/SQLite backend, enabling advanced search capabilities, user persistence, and glassmorphic UI aesthetics.

---

## 🚀 Live Demo
- **Frontend**: [https://vibestream-a9c8c.web.app](https://vibestream-a9c8c.web.app)
- **Backend API**: [https://vibestream-cjjt.onrender.com](https://vibestream-cjjt.onrender.com)

---

## ✨ Features

- **Advanced Search Engine**: Intelligent query engineering to prioritize high-quality audio and official artist tracks.
- **Premium Playback**: Full-featured player with shuffle, repeat, and volume controls.
- **User Accounts**: Custom authentication system with support for Firebase/Google Login.
- **Personal Library**: Create playlists, like songs, and track your listening history.
- **Mobile First Design**: Fully responsive, glassmorphic UI built with Tailwind CSS and Framer Motion.
- **Hybrid Deployment**: Optimized for speed (Firebase Hosting) and data persistence (Persistent Backend).

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Lucide React, Framer Motion.
- **State Management**: Zustand with persistence.
- **Backend**: Node.js, Express, SQLite (Better-SQLite3), Express Session.
- **Authentication**: Bcrypt.js & Firebase Auth.
- **Hosting**: Firebase Hosting (Frontend), Render (Backend).

---

## 📦 Installation & Local Development

### Prerequisites
- Node.js (v18+)
- npm

### Setup
1. Clone the repository:
   ```bash
   git clone [your-repo-url]
   cd VibeStream
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   Create a `.env` file for local development:
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   ```

4. Start development server:
   ```bash
   # Starts both backend and frontend (Vite)
   npm run dev
   ```

---

## 🚢 Deployment

### 1. Backend (Render/Railway)
- Set Environment Variable: `NODE_ENV=production`.
- Build Command: `npm install`.
- Start Command: `npm start`.

### 2. Frontend (Firebase Hosting)
1. Build the project:
   ```bash
   npm run build
   ```
2. Deploy to Firebase:
   ```bash
   firebase deploy
   ```

---

## 📄 License
MIT License. Created with ❤️ by Nathan/Edward.
