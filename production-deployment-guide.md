# 🚀 AIGentic Production Deployment Guide

## 📋 **Overview**
This guide covers deploying your AIGentic platform to production with multiple deployment options including Vercel (recommended), Railway, and AWS.

## 🔧 **Pre-Deployment Checklist**

### ✅ **1. Environment Variables Setup**
Create a `.env.production` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
DIRECT_URL="postgresql://username:password@host:port/database?sslmode=require"

# Authentication
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-super-secret-jwt-key-32-chars-min"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"

# Redis (for BullMQ/Job Queue)
REDIS_URL="redis://username:password@host:port"

# AI Providers
OPENAI_API_KEY="sk-your-openai-api-key"
ANTHROPIC_API_KEY="sk-ant-your-anthropic-key"
GOOGLE_AI_API_KEY="your-google-ai-api-key"
ELEVENLABS_API_KEY="your-elevenlabs-api-key"

# Storage
GOOGLE_DRIVE_CLIENT_ID="your-google-drive-client-id"
GOOGLE_DRIVE_CLIENT_SECRET="your-google-drive-secret"
GOOGLE_DRIVE_REFRESH_TOKEN="your-refresh-token"

# Monitoring & Security
ERROR_WEBHOOK_URL="https://hooks.slack.com/your-webhook-url"
WEBHOOK_SECRET="your-webhook-secret"
```

### ✅ **2. Database Setup**
Your options for production database:

**Option A: Neon (Recommended - Serverless PostgreSQL)**
```bash
# Sign up at neon.tech
# Create new project
# Copy connection string to DATABASE_URL
```

**Option B: Supabase**
```bash
# Sign up at supabase.com
# Create new project
# Go to Settings > Database
# Copy connection string
```

**Option C: PlanetScale**
```bash
# Sign up at planetscale.com
# Create database
# Create production branch
# Copy connection string
```

### ✅ **3. Redis Setup**
For job queue functionality:

**Option A: Upstash Redis (Recommended)**
```bash
# Sign up at upstash.com
# Create Redis database
# Copy REDIS_URL
```

**Option B: Redis Cloud**
```bash
# Sign up at redis.com
# Create database
# Copy connection string
```

## 🌐 **Deployment Options**

### 🔥 **Option 1: Vercel (Recommended)**

**Step 1: Prepare for Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login
```

**Step 2: Configure Vercel**
Create `vercel.json`:
```json
{
  "builds": [
    {
      "src": "apps/web/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "apps/web/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "apps/web/$1"
    }
  ],
  "env": {
    "DATABASE_URL": "@database_url",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "GOOGLE_CLIENT_ID": "@google_client_id",
    "GOOGLE_CLIENT_SECRET": "@google_client_secret"
  }
}
```

**Step 3: Deploy**
```bash
# From project root
cd apps/web
vercel --prod

# Follow prompts to:
# 1. Link to Vercel project
# 2. Configure build settings
# 3. Add environment variables
```

**Step 4: Configure Environment Variables in Vercel**
```bash
# Add all environment variables from .env.production
# Go to Vercel Dashboard > Project > Settings > Environment Variables
```

### 🚂 **Option 2: Railway**

**Step 1: Prepare for Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login
```

**Step 2: Deploy**
```bash
# From project root
railway new
railway link
railway up

# Add environment variables
railway variables set DATABASE_URL="your-database-url"
railway variables set NEXTAUTH_SECRET="your-secret"
# ... add all other variables
```

### ☁️ **Option 3: AWS (Advanced)**

**Step 1: Container Setup**
Create `Dockerfile`:
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/workflow-engine/package.json ./packages/workflow-engine/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm install -g pnpm
RUN pnpm build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/web/server.js"]
```

**Step 2: Deploy to AWS**
```bash
# Build and push to ECR
# Deploy using ECS Fargate or App Runner
# Configure environment variables
# Set up RDS for PostgreSQL
# Configure ElastiCache for Redis
```

## 🔐 **Security Configuration**

### **1. Google OAuth Setup**
```bash
# Go to Google Cloud Console
# APIs & Services > Credentials
# Update OAuth 2.0 Client
# Add production URLs:
# - Authorized origins: https://yourdomain.com
# - Authorized redirect URIs: https://yourdomain.com/api/auth/callback/google
```

### **2. CORS Configuration**
Update `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

### **3. Environment Security**
```bash
# Ensure all secrets are properly set
# Use strong NEXTAUTH_SECRET (32+ characters)
# Rotate API keys regularly
# Enable 2FA on all service accounts
```

## 📊 **Post-Deployment Setup**

### **1. Database Migration**
```bash
# Run Prisma migrations
npx prisma migrate deploy

# Seed the database (if needed)
npx prisma db seed
```

### **2. Health Checks**
Create monitoring endpoints:
```bash
# Test these endpoints after deployment:
GET https://yourdomain.com/api/health
GET https://yourdomain.com/api/auth/session
POST https://yourdomain.com/api/jobs (with auth)
```

### **3. Performance Monitoring**
Set up monitoring with:
- **Vercel Analytics** (if using Vercel)
- **Sentry** for error tracking
- **LogRocket** for user session replay
- **New Relic** for APM

## 🎯 **Testing Production**

### **1. Functional Testing**
```bash
# Test all critical paths:
✅ User registration/login
✅ Project creation
✅ Workflow execution
✅ File uploads
✅ Real-time updates
✅ Error handling
```

### **2. Performance Testing**
```bash
# Use tools like:
- Lighthouse (built into Chrome)
- GTmetrix
- WebPageTest
- Load testing with Artillery
```

## 🔄 **CI/CD Setup**

### **GitHub Actions Workflow**
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Build
        run: pnpm build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## 📱 **Domain Setup**

### **1. Custom Domain**
```bash
# Purchase domain (Namecheap, GoDaddy, etc.)
# Configure DNS records:
# A record: @ -> Vercel IP
# CNAME record: www -> yourdomain.vercel.app
```

### **2. SSL Certificate**
```bash
# Vercel automatically provides SSL
# For other platforms, use Let's Encrypt
# Ensure HTTPS redirect is enabled
```

## 🎉 **Go Live Checklist**

### **Final Steps:**
- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] OAuth redirects updated
- [ ] Domain configured with SSL
- [ ] Error monitoring setup
- [ ] Performance monitoring active
- [ ] Backup strategy implemented
- [ ] Team access configured
- [ ] Documentation updated

## 🆘 **Troubleshooting**

### **Common Issues:**
```bash
# Build failures
- Check TypeScript errors
- Verify all environment variables
- Clear build cache

# Runtime errors
- Check database connection
- Verify API keys
- Check logs in deployment platform

# OAuth issues
- Verify redirect URIs
- Check client ID/secret
- Ensure NEXTAUTH_URL is correct
```

## 🎯 **Production Optimization**

### **Performance:**
- Enable Next.js Image optimization
- Configure CDN for static assets
- Implement caching strategies
- Use Redis for session storage

### **Monitoring:**
- Set up error alerts
- Monitor API response times
- Track user analytics
- Monitor AI provider usage/costs

---

**🎉 Your AIGentic platform is now ready for production!**

**Quick Start Command:**
```bash
# For Vercel deployment (recommended)
cd apps/web && vercel --prod
```

**Need Help?** 
- Check deployment platform docs
- Monitor error logs
- Use health check endpoints
- Test all critical user flows 