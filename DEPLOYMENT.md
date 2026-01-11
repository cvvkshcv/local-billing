# GitHub Pages Deployment Guide

This guide will help you deploy the Billing System to GitHub Pages.

## Prerequisites

- A GitHub account
- Git installed on your computer
- Basic knowledge of Git commands

## Step-by-Step Deployment

### 1. Create a GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **+** icon in the top right corner
3. Select **New repository**
4. Name your repository (e.g., `billing-system`)
5. Choose **Public** or **Private**
6. **Do NOT** initialize with README, .gitignore, or license (we already have these)
7. Click **Create repository**

### 2. Initialize Git and Push Code

Open your terminal/command prompt in the project directory and run:

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Billing System"

# Add remote repository (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on the **Settings** tab
3. Scroll down to the **Pages** section in the left sidebar
4. Under **Source**, select:
   - Branch: **main** (or **master**)
   - Folder: **/ (root)**
5. Click **Save**

### 4. Access Your Deployed App

- GitHub Pages will take a few minutes to build and deploy
- Your app will be available at:
  ```
  https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
  ```
- You can find the exact URL in the **Pages** settings section

## Updating Your Deployment

Whenever you make changes:

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

GitHub Pages will automatically rebuild and deploy your changes (usually within 1-2 minutes).

## Custom Domain (Optional)

If you want to use a custom domain:

1. In your repository **Settings** → **Pages**
2. Enter your custom domain in the **Custom domain** field
3. Follow GitHub's instructions to configure DNS

## Troubleshooting

### App not loading
- Check that `index.html` is in the root directory
- Verify all file paths are relative (not absolute)
- Check browser console for errors

### Camera not working
- GitHub Pages serves over HTTPS, which is required for camera access
- Make sure you're accessing the site via the GitHub Pages URL (not file://)
- Grant camera permissions when prompted

### Database not saving
- LocalStorage works per domain
- Data is stored locally in the browser
- Clearing browser data will delete all stored data

## Security Note

- The admin password is stored in plain text in `app.js`
- Change the `ADMIN_PASSWORD` constant before deploying if needed
- Consider using environment variables or a more secure authentication method for production use
