# 🌳 Akshaya Vana - Environmental Project Management Platform

Akshaya Vana is a professional, production-ready environmental project tracker designed to manage and monitor sustainability initiatives. It features real-time analytics, secure role-based access control, and a modern, responsive UI.

## 🚀 Features

- **Modern UI/UX:** Premium sustainability-inspired interface using Forest Green & Emerald tones, Lucide icons, and professional layouts.
- **Advanced Dashboard:** Real-time statistics driven by MongoDB, featuring interactive charts (Chart.js) for status distribution, category progress, and regional density.
- **Project Management:** Full CRUD operations with comprehensive validation. Track project name, description, category, location, status, progress targets, units, and timelines.
- **Progress Tracking:** Interactive progress bars with precise calculations. Automatic tracking of remaining targets and progress history logs.
- **Role-Based Access Control (RBAC):**
  - **Admin:** Full system control, user management, and project oversight.
  - **Manager:** Create and manage authorized projects.
  - **Viewer:** Read-only access to dashboard and projects.
- **Security:** JWT-based authentication, bcrypt password hashing, input sanitization, and backend-enforced permissions.
- **Responsive Design:** Optimized for Desktop, Tablet, and Mobile devices.

## 🛠 Tech Stack

- **Frontend:** HTML5, Modern CSS3 (Custom properties, Flexbox/Grid), Vanilla JavaScript (ES6+), Chart.js, Lucide Icons.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB with Mongoose ODM.
- **Authentication:** JSON Web Tokens (JWT) & bcrypt.js.

## 📂 Project Structure

```text
akshaya-vana/
├── public/              # Frontend assets
│   ├── css/             # Modern stylesheets
│   ├── js/              # Application logic (State management, API, UI)
│   ├── index.html       # Single Page Application entry
│   └── assets/          # Images and static files
├── server.js            # Express server & API endpoints
├── .env                 # Environment variables (Excluded from Git)
└── package.json         # Dependencies and scripts
```

## ⚙️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd akshaya-vana
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_key
   ```

4. **Run the application:**
   - Development (with watch mode): `npm run dev`
   - Production: `npm start`
   - Reseed Database: `npm start -- --reseed`

## 🔑 Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@akshayavana.com` | `Password@123` |
| **Manager** | `manager@akshayavana.com` | `Password@123` |
| **Viewer** | `viewer@akshayavana.com` | `Password@123` |

## 🧪 Testing Performed

- [x] **Authentication:** Verified registration, login, and JWT token persistence.
- [x] **RBAC:** Confirmed that Viewers cannot edit/delete and Managers can only edit their own projects.
- [x] **Progress Logic:** Tested "Target 1000, Progress 600 -> 850" flow. Verified that progress cannot exceed targets or be negative.
- [x] **Real-time Analytics:** Verified that adding/updating projects reflects immediately in dashboard charts and stats.
- [x] **Responsiveness:** Tested on Mobile (375px), Tablet (768px), and Desktop (1440px).
- [x] **Error Handling:** Verified toast notifications for API failures and input validation errors.

## 📄 License

This project is open-source and available for educational and portfolio use.
