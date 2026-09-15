# Minimal Expense Tracker 💸

A fully-featured, offline-first Personal Finance Progressive Web App (PWA) designed to be highly responsive, blazing fast, and feature-rich without relying on a heavy backend.

## 🚀 Features

* **Offline-First Architecture**: Log expenses even when you have no internet. Uses local `Zustand` state combined with `Supabase` synchronization.
* **AI Receipt Scanning**: Integrated `tesseract.js` for on-device, offline OCR. Take a picture of a receipt and the app automatically extracts the total amount and merchant name.
* **Gamification & Streaks 🔥**: Build healthy financial habits. The app tracks your daily logging streaks and rewards you with visual badges.
* **Subscription Manager**: Track your recurring monthly and yearly bills. Get visual reminders of next billing dates and log payments with one click.
* **IOU Tracker**: Keep track of money you've lent to friends ("To Collect") and money you owe ("To Pay"). Settling debts automatically logs them into your main budget.
* **Wishlist & Savings Goals**: Add items you want to buy and track your progress based on your current savings rate.
* **Push Notifications**: Serverless Web Push Notifications powered by Supabase Edge Functions and pg_cron to remind you to log expenses or pay bills.
* **Native OS Integration**: Uses the Web Share Target API. You can share text or URLs directly from other apps on your phone into the Expense Tracker to instantly log them.
* **Customization**: Fully customizable categories with Emojis, Dark/Light modes, and multiple color themes.

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, `shadcn/ui` components, Framer Motion
- **State Management**: Zustand (with local persistence)
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Edge Functions)
- **AI / OCR**: Tesseract.js (Client-side)
- **PWA**: `vite-plugin-pwa` (Configured for Auto-Updates)

## 📦 Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dev4nithinkumarreddy/expense-tracker.git
   cd expense-tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Supabase keys:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the dev server:**
   ```bash
   npm run dev
   ```

## 📲 PWA Installation (Add to Home Screen)

The app is built as a Progressive Web App (PWA) with the `autoUpdate` strategy. 
When you visit the deployed URL on iOS or Android, use your browser's **"Add to Home Screen"** option. 
- It functions exactly like a native app.
- When new features are pushed to production, the app will **automatically update** the next time you open it from your home screen.

## 🗄️ Database Schema

The app relies on several Supabase tables protected by Row Level Security (RLS) to ensure users can only access their own data.
* `expenses`: Core transaction logs
* `budgets`: Custom user-defined category limits
* `bills`: Simple recurring tasks
* `subscriptions`: Advanced recurring trackers (monthly/yearly)
* `debts`: IOU tracker
* `wishlist`: Savings goals
* `push_subscriptions`: Web Push API tokens for serverless notifications
* `user_settings`: Synced themes, privacy modes, and categories

## 📄 License

MIT License
