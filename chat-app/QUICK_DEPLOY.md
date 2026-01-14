# Quick Deploy Checklist ✅

## 1️⃣ Push to GitHub (5 minutes)

```bash
cd C:\Users\Gargee\Desktop\Artefact\redis-sse
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 2️⃣ Deploy Backend to Render (10 minutes)

1. Go to https://render.com
2. New + → Web Service
3. Connect GitHub repo
4. Settings:
   - Root Directory: `chat-app/backend`
   - Build: `npm install`
   - Start: `npm start`
5. Add Environment Variables:
   - `PORT` = `5000`
   - `MONGODB_URI` = (your MongoDB URL)
   - `REDIS_URL` = (your Redis URL)
   - `JWT_SECRET` = (random secret)
   - `NODE_ENV` = `production`
6. Deploy → Copy backend URL

## 3️⃣ Deploy Frontend to Vercel (5 minutes)

1. Go to https://vercel.com
2. Import GitHub repo
3. Settings:
   - Root Directory: `chat-app/frontend`
   - Framework: Create React App
4. Add Environment Variable:
   - `REACT_APP_API_URL` = (your Render backend URL)
5. Deploy → Copy frontend URL

## 4️⃣ Update Backend (2 minutes)

1. Go back to Render
2. Add Environment Variable:
   - `FRONTEND_URL` = (your Vercel frontend URL)
3. Save (auto redeploys)

## 5️⃣ Test! 🎉

Visit your Vercel URL and test:
- ✅ Register
- ✅ Login
- ✅ Chat
- ✅ Real-time messages

---

**Total Time: ~20 minutes**

**Your app is live! 🚀**
