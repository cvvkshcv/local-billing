# Pre-Deployment Checklist

Use this checklist before deploying to GitHub Pages:

## ✅ Code Review

- [ ] All file paths are relative (not absolute)
- [ ] No hardcoded local file paths
- [ ] All external libraries are loaded via CDN
- [ ] No server-side dependencies
- [ ] Admin password is set (or changed from default)

## ✅ File Structure

- [ ] `index.html` is in the root directory
- [ ] `app.js` is in the root directory
- [ ] `style.css` is in the root directory
- [ ] All referenced files exist

## ✅ Testing

- [ ] Test locally by opening `index.html` in a browser
- [ ] QR scanner works (requires HTTPS, will work on GitHub Pages)
- [ ] Bill generation works
- [ ] Dashboard displays correctly
- [ ] Export functions work
- [ ] Admin panel works with password

## ✅ Git Setup

- [ ] Git repository initialized
- [ ] `.gitignore` file is present
- [ ] All files are committed
- [ ] Repository is pushed to GitHub

## ✅ GitHub Pages Configuration

- [ ] Repository is public (or you have GitHub Pro for private repos)
- [ ] GitHub Pages is enabled in Settings
- [ ] Source branch is set (main or master)
- [ ] Root folder is selected

## ✅ Post-Deployment

- [ ] Visit the GitHub Pages URL
- [ ] Test all features on the live site
- [ ] Verify camera access works (HTTPS required)
- [ ] Check browser console for errors
- [ ] Test on different browsers if possible

## Common Issues

### Camera not working
- **Solution**: Make sure you're accessing via HTTPS (GitHub Pages provides this automatically)

### 404 errors
- **Solution**: Check that `index.html` is in the root directory

### Database not saving
- **Solution**: This is normal - LocalStorage is browser-specific

### Styles not loading
- **Solution**: Verify `style.css` path is correct in `index.html`
