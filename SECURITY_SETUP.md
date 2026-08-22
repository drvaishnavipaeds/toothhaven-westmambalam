# 🔐 Security Guidelines for Tooth Haven

## Critical Security Issues Fixed

This document outlines the security fixes implemented and best practices for maintaining this application.

### ✅ Fixed Issues

1. **Exposed API Keys** - Moved from hardcoded values to environment variables
   - Razorpay Key
   - UPI Credentials
   
2. **Environment Variables** - All secrets now loaded from `.env.local`

3. **Payment Validation** - Added amount validation and error handling

4. **.gitignore Updated** - Prevents accidental commits of sensitive files

---

## 🚀 Setup Instructions (Step-by-Step for Non-Technical Users)

### Step 1: Create Your Local Environment File

1. Go to your project folder on your computer
2. Look for the file named `.env.local.example`
3. **Right-click** on it and select **"Open with"** → Choose **Notepad** (or any text editor)
4. This file shows you what environment variables you need
5. **Save this file as `.env.local`** (change the name from `.env.local.example` to `.env.local`)

### Step 2: Fill in Your Secrets (For Development Only)

Edit `.env.local` and add your actual values:

```
# Supabase (Get from supabase.co dashboard)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-key-here

# Razorpay (Get from razorpay.com dashboard)
VITE_RAZORPAY_KEY=rzp_test_SdQ7562mMWoVkM

# Your UPI Details
VITE_UPI_ID=your-upi-id@bank
VITE_UPI_PAYEE_NAME=Tooth Haven Dental

# Other settings
VITE_API_TIMEOUT_MS=30000
VITE_SESSION_TIMEOUT_MINUTES=30
```

### Step 3: Important - Never Share These Files!

⚠️ **DO NOT:**
- Share `.env.local` with anyone
- Upload it to GitHub
- Post it in messages or emails
- Commit it to the repository

✅ **DO:**
- Keep it only on your computer
- Git will automatically ignore it (it's in .gitignore)

---

## 🔑 How to Get Your Actual Keys

### Razorpay Key
1. Go to https://dashboard.razorpay.com/
2. Log in with your account
3. Go to **Settings** → **API Keys**
4. Copy the **Live Key** (for production)
5. Replace `rzp_test_SdQ7562mMWoVkM` with your live key

### Supabase Credentials
1. Go to https://app.supabase.com/
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** and **Anon Public Key**
5. Paste them in `.env.local`

### UPI Details
1. Get your UPI ID from your bank app (format: `username@bankname`)
2. Add your clinic name as PAYEE_NAME

---

## 📋 What Changes Were Made

### Files Modified:

1. **`.env.example`** - Template for all environment variables
2. **`.env.local.example`** - Development example with test keys
3. **`src/components/PaymentSection.tsx`** - Removed hardcoded secrets
4. **`.gitignore`** - Now prevents `.env.local` from being committed

### What NOT to Change:
- `.env.example` - This is safe to share, it doesn't have real values
- Other component files - They now automatically read from environment variables

---

## 🔄 How to Merge These Changes (Simple Steps)

### Option 1: Using GitHub Website (Easiest - No Coding!)

1. Go to: https://github.com/drvaishnavipaeds/toothhaven-westmambalam
2. Click the **"Pull requests"** tab at the top
3. You'll see a new PR called **"security/fix-critical-issues"**
4. Click **"View pull request"**
5. Review the changes (you'll see all the files that changed)
6. Click **"Merge pull request"** (green button)
7. Click **"Confirm merge"**
8. Done! ✅

### Option 2: Using Command Line (For Developers)

```bash
# Update your local copy
git pull origin main

# Switch to the security branch
git checkout security/fix-critical-issues

# Go back to main and merge
git checkout main
git merge security/fix-critical-issues

# Push to GitHub
git push origin main
```

---

## 🛡️ Security Checklist Before Going Live

- [ ] Create `.env.local` with your **production** Razorpay key
- [ ] Update all Supabase keys to **production** values
- [ ] Test payments with small amounts first (₹1-₹10)
- [ ] Remove any old `.env` files with test keys
- [ ] Never push `.env.local` to GitHub
- [ ] Ask your team to do the same setup on their computers

---

## ⚠️ What If I Accidentally Committed a Secret?

**DO NOT PANIC!** Follow these steps:

1. Go to https://github.com/drvaishnavipaeds/toothhaven-westmambalam
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Regenerate all your API keys immediately (in Razorpay and Supabase)
4. Create a new `.env.local` with the new keys
5. Contact GitHub support if needed

---

## 📞 Getting Help

If you're stuck:
1. Read the error message carefully
2. Search the error on Google
3. Check the official documentation for the service (Razorpay, Supabase, etc.)
4. Ask in a developer forum (Stack Overflow, etc.)

---

## ✨ Summary

These security fixes ensure:
- Your API keys are **never exposed** publicly
- Your `.env.local` is **never uploaded** to GitHub
- Your payments are **secure** with proper validation
- Your clinic data is **protected**

**Next Step:** Follow Step 1-3 above to set up your `.env.local` file! 🚀
