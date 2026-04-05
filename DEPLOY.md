# Purelike - Deployment Guide

## Deploy via GitHub + Cloudflare Pages

### 1️⃣ Create a GitHub Repository

```bash
# In your project directory
git init
git add .
git commit -m "Initial commit: Purelike app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/purelike.git
git push -u origin main
```

### 2️⃣ Create Cloudflare Account & Project

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign up or log in
3. Go to **Pages** → **Create a project**
4. Select **Connect a Git account**
5. Authorize GitHub and select your `purelike` repo
6. Click **Begin setup**

### 3️⃣ Build Configuration

When setting up in Cloudflare:

- **Framework preset:** None
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/`
- Leave environment variables empty for now

### 4️⃣ Set GitHub Secrets

Your repo now has CI/CD configured. To enable auto-deploy:

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Create two new secrets:
   - `CLOUDFLARE_API_TOKEN` → Get from [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → Create Token → Edit Cloudflare Workers
   - `CLOUDFLARE_ACCOUNT_ID` → Get from [dash.cloudflare.com](https://dash.cloudflare.com) → Copy your Account ID

### 5️⃣ Done! 🚀

Every time you push to `main`, GitHub Actions will:
- Build the project
- Deploy to Cloudflare Pages
- Your site auto-updates

Your site will be live at: **https://purelike.pages.dev**

---

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

Output: `dist/` folder ready for deployment
