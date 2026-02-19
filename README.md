# STLABSPORTFOLIO

Minimal dark STLABSPORTFOLIO built with Vite + React + React Router.

## Before deploying — update these

| File | What to change |
|------|----------------|
| `src/components/Nav.jsx` | Replace `Stateless Labs` with your org name |
| `src/pages/Home.jsx` | Update headline, bio, and About section |
| `src/pages/projects/calculator/CalculatorApp.jsx` | Add real Play Store / App Store links |
| `src/pages/projects/calculator/PrivacyPolicy.jsx` | Replace `your@email.com` |
| `public/CNAME` | Replace `yourdomain.com` with your domain |
| `index.html` | Update `<title>` |

## Local development

```bash
npm install
npm run dev    # http://localhost:5173
```

## Deploy to GitHub Pages

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

### 2. Enable Pages
Repo → Settings → Pages → Source → **GitHub Actions**

The workflow auto-deploys on every push to `main`.

### 3. DNS records (in your registrar)
```
A  @  185.199.108.153
A  @  185.199.109.153
A  @  185.199.110.153
A  @  185.199.111.153
```
Then Settings → Pages → Enforce HTTPS.

## Adding another app

1. Add entry to `projects` array in `src/pages/Projects.jsx`
2. Create `src/pages/projects/APPNAME/AppName.jsx`
3. Create `src/pages/projects/APPNAME/PrivacyPolicy.jsx`
4. Add routes in `src/App.jsx`
