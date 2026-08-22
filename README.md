# 🦷 Tooth Haven - Dental Clinic Management System

A modern, bilingual (English & Tamil) web application for dental clinic management with patient portal, appointment booking, treatment tracking, and secure payment integration.

## ✨ Features

- **Patient Portal** - Patients can view their treatment history, appointments, and investigations
- **Appointment Booking** - Real-time appointment scheduling
- **Secure Payments** - UPI & Card payments via Razorpay
- **Admin Dashboard** - Clinic staff can manage patients, appointments, and treatments
- **Bilingual Support** - English and Tamil language support
- **Medical Imaging** - DICOM image viewer for X-rays and scans
- **WhatsApp Integration** - OTP via WhatsApp for patient verification
- **Responsive Design** - Works on mobile, tablet, and desktop

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Shadcn UI Components
- **Backend**: Supabase (PostgreSQL + Auth)
- **Payments**: Razorpay + UPI
- **Medical Imaging**: Cornerstone.js + DICOM Parser
- **State Management**: React Query + Context API
- **Forms**: React Hook Form + Zod

## 📋 Prerequisites

- Node.js 18+ or Bun
- Supabase account (https://supabase.com)
- Razorpay account (https://razorpay.com)
- UPI ID from your bank

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/drvaishnavipaeds/toothhaven-westmambalam.git
cd toothhaven-westmambalam
```

### 2. Install Dependencies
```bash
# Using npm
npm install

# OR using bun
bun install

# OR using yarn
yarn install
```

### 3. Setup Environment Variables ⚠️ IMPORTANT

**READ THIS CAREFULLY - Security depends on this!**

1. Copy `.env.local.example` and rename it to `.env.local`:
```bash
cp .env.local.example .env.local
```

2. Open `.env.local` and fill in your actual credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_RAZORPAY_KEY=your_razorpay_test_key
VITE_UPI_ID=your_upi_id@bank
VITE_UPI_PAYEE_NAME=Your Clinic Name
```

⚠️ **NEVER commit `.env.local` to GitHub** - it's in .gitignore for security!

For detailed setup instructions, see [SECURITY_SETUP.md](./SECURITY_SETUP.md)

### 4. Start Development Server
```bash
npm run dev
# Server starts at http://localhost:5173
```

### 5. Build for Production
```bash
npm run build
```

## 📖 Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Shadcn UI components
│   ├── admin/          # Admin dashboard components
│   ├── portal/         # Patient portal components
│   └── *.tsx           # Page sections (Hero, Services, etc.)
├── pages/              # Page components
│   ├── Index.tsx       # Home page
│   ├── PatientPortal.tsx
│   ├── AdminDashboard.tsx
│   └── AdminLogin.tsx
├── contexts/           # React Context (Auth, Language)
├── hooks/              # Custom React hooks
├── integrations/       # External integrations (Supabase)
├── lib/                # Utility functions
└── App.tsx             # Main app component

public/                 # Static assets
supabase/              # Database migrations & functions
```

## 🔐 Security

This application handles sensitive medical data. Security features include:

- ✅ Environment variables for all secrets (no hardcoding)
- ✅ Supabase row-level security (RLS) for patient data
- ✅ Session-based authentication with 30-minute timeout
- ✅ OTP verification for patient login
- ✅ Input validation on all forms
- ✅ HTTPS required for production
- ✅ Payment verification on server-side

**For security setup and best practices**, see [SECURITY_SETUP.md](./SECURITY_SETUP.md)

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run test` - Run Vitest
- `npm run test:watch` - Run tests in watch mode

## 🌐 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms

Ensure these environment variables are set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_RAZORPAY_KEY`
- `VITE_UPI_ID`
- `VITE_UPI_PAYEE_NAME`

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js` | Backend & Auth |
| `@tanstack/react-query` | Data fetching & caching |
| `react-router-dom` | Routing |
| `react-hook-form` | Form management |
| `zod` | Schema validation |
| `tailwindcss` | Styling |
| `lucide-react` | Icons |
| `sonner` | Toast notifications |
| `cornerstone-core` | Medical imaging |

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 👤 Contact

**Tooth Haven Dental Care**
- Email: dr.vaishnavipaeds@gmail.com
- Location: West Mambalam, Chennai

## 🔔 Important Notes

- **Patient Data**: This application handles sensitive medical data. Ensure HIPAA/local data protection compliance.
- **Payments**: Always use production Razorpay key for real payments (not test key).
- **Backup**: Regularly backup your Supabase database.
- **Updates**: Keep dependencies updated for security patches.

---

**Last Updated**: August 2026  
**Security Review**: ✅ Passed (Secrets moved to environment variables)
