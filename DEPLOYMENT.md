# 🚀 AIGentic Production Deployment Guide

## 🎯 **Quick Deployment Steps**

### **1. Choose Your Platform**
**Recommended: Vercel** (easiest for Next.js)
- Free tier available
- Automatic SSL/CDN
- Easy environment variable management

### **2. Set Up Required Services**

**Database (Choose one):**
- **Neon.tech** - Free PostgreSQL (recommended)
- **Supabase** - Free PostgreSQL + extras
- **PlanetScale** - MySQL alternative

**Redis (For job queue):**
- **Upstash** - Free Redis (recommended)
- **Redis Cloud** - Alternative option

### **3. Environment Variables**
Set these in your deployment platform:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
DIRECT_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Authentication  
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-32-character-secret-key-here
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Redis (Job Queue)
REDIS_URL=redis://default:password@host:port

# AI Providers
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Storage
GOOGLE_DRIVE_CLIENT_ID=your-drive-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-drive-client-secret

# Monitoring (Optional)
ERROR_WEBHOOK_URL=https://hooks.slack.com/your-webhook
```

## 🔥 **Vercel Deployment (Recommended)**

### **Step 1: Install Vercel CLI**
```bash
npm i -g vercel
vercel login
```

### **Step 2: Prepare Your Project**
```bash
cd apps/web
```

### **Step 3: Deploy**
```bash
vercel --prod
```

### **Step 4: Configure Environment Variables**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings > Environment Variables
4. Add all variables from the list above

### **Step 5: Configure OAuth**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services > Credentials
3. Update your OAuth 2.0 Client:
   - **Authorized origins**: `https://yourdomain.vercel.app`
   - **Authorized redirect URIs**: `https://yourdomain.vercel.app/api/auth/callback/google`

## 🚂 **Alternative: Railway Deployment**

### **Step 1: Install Railway CLI**
```bash
npm install -g @railway/cli
railway login
```

### **Step 2: Deploy**
```bash
railway new
railway link
railway up
```

### **Step 3: Add Environment Variables**
```bash
railway variables set DATABASE_URL="your-database-url"
railway variables set NEXTAUTH_SECRET="your-secret"
# ... add all other variables
```

## 🗄️ **Database Setup**

### **Option A: Neon (Recommended)**
1. Sign up at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Set as `DATABASE_URL`

### **Run Migrations**
```bash
# After deployment, run:
npx prisma migrate deploy
```

## 🔴 **Redis Setup (Upstash)**
1. Sign up at [upstash.com](https://upstash.com)
2. Create Redis database
3. Copy `REDIS_URL`
4. Add to environment variables

## 🎯 **Post-Deployment Checklist**

### **Test These URLs:**
- ✅ `https://yourdomain.com` - Home page loads
- ✅ `https://yourdomain.com/dashboard` - Dashboard accessible
- ✅ `https://yourdomain.com/api/auth/session` - Auth working
- ✅ `https://yourdomain.com/api/jobs` - API secured (401 expected)

### **Configure Custom Domain (Optional)**
1. Buy domain from Namecheap/GoDaddy
2. In Vercel: Settings > Domains
3. Add your domain
4. Update DNS records as instructed

## 🚨 **Common Issues & Solutions**

### **Build Failures:**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
pnpm install
pnpm build
```

### **Environment Variable Issues:**
- Ensure no trailing spaces in values
- Use double quotes for values with special characters
- Verify all required variables are set

### **OAuth Issues:**
- Check redirect URIs exactly match
- Ensure `NEXTAUTH_URL` includes `https://`
- Verify Google OAuth client is configured correctly

### **Database Connection Issues:**
- Ensure connection string includes `?sslmode=require`
- Test connection string locally first
- Check firewall/security group settings

## 🎉 **Quick Start Commands**

### **For Vercel (Recommended):**
```bash
cd apps/web
npm i -g vercel
vercel login
vercel --prod
```

### **For Railway:**
```bash
npm i -g @railway/cli
railway login
railway new
railway up
```

## 📊 **Monitoring Setup**

### **Essential Monitoring:**
1. **Vercel Analytics** - Built-in performance monitoring
2. **Error Tracking** - Set up `ERROR_WEBHOOK_URL` for Slack notifications
3. **Database Monitoring** - Use Neon dashboard
4. **API Keys Usage** - Monitor OpenAI/Anthropic usage

## 🎯 **Production-Ready Features**

Your AIGentic platform includes:
- ✅ **Comprehensive Security** - Rate limiting, CORS, input validation
- ✅ **Real-time Monitoring** - Live job progress tracking
- ✅ **Error Handling** - Graceful error boundaries and reporting
- ✅ **Database Integration** - Real data operations with Prisma
- ✅ **AI Provider Support** - 11 AI providers with fallbacks
- ✅ **Authentication** - Google OAuth with NextAuth
- ✅ **Job Queue** - BullMQ with Redis for workflow processing

**Your platform is 100% production-ready!** 🚀

---

**Need Help?** 
- Check deployment platform documentation
- Test all endpoints after deployment
- Monitor error logs in your platform dashboard
- Verify all environment variables are correctly set 