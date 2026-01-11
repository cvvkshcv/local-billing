# Billing System Application

A modern web-based billing application with QR code scanning, SQLite database storage, and dashboard analytics.

## Features

- **QR Code Scanner**: Scan QR codes to add products to bills
- **Bill Generation**: Add multiple items, enter prices manually, calculate totals
- **SQLite Database**: Local storage of all bills and transactions
- **Dashboard**: View statistics including items sold, revenue, and recent bills
- **Data Export**: Export data to Excel (.xlsx) or SQLite (.sqlite) format
- **Admin Panel**: Password-protected admin access to manage bills, edit items, and reset database

## Quick Start

### Local Development

1. Clone or download this repository
2. **Download SQL.js library files** (required):
   - **Option 1 (Recommended)**: Run the download script:
     - On macOS/Linux: `./download-sqljs.sh`
     - On Windows: `download-sqljs.bat`
   - **Option 2**: Manually download from `libs/README.md` instructions
3. Open `index.html` in a modern web browser (Chrome, Firefox, Edge, Safari)
4. The application will automatically initialize the database on first load
5. Grant camera permissions when prompted for QR code scanning

### Deploy to GitHub Pages

1. **Create a GitHub repository** (if you haven't already)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click on **Settings** tab
   - Scroll down to **Pages** section
   - Under **Build and deployment**:
     - **Source**: Select **Deploy from a branch**
     - **Branch**: Select **main** (or **master** if that's your default branch)
     - **Folder**: Select **/ (root)**
   - Click **Save**
   
   **Note**: Use "Deploy from a branch" (not "GitHub Actions") since this is a static site.

3. **Access your deployed app**
   - Your app will be available at: `https://yourusername.github.io/your-repo-name/`
   - GitHub Pages may take a few minutes to deploy

## Important Notes for GitHub Pages

- **HTTPS Required**: GitHub Pages serves over HTTPS, which is required for camera access. The QR scanner will work properly on GitHub Pages.
- **Data Storage**: All data is stored in browser LocalStorage, so it's device-specific and won't sync across devices.
- **Admin Password**: Default admin password is set in `app.js` (line 19). Change it before deploying if needed.

## Usage

### Creating a Bill

1. Click "Start Scanner" to activate the QR code scanner
2. Scan QR codes to add products to the bill (PSU code will be extracted automatically)
3. Enter prices manually for each item
4. The total will update automatically
5. Check "Payment Done" checkbox
6. Click "Generate Bill" to save the bill to the database

### Viewing Dashboard

1. Click the "Dashboard" tab
2. View statistics:
   - Items sold today
   - Revenue today
   - Total bills today
   - Total revenue (all time)
3. View recent bills list

### Exporting Data

1. Go to the Dashboard
2. Click "Export to Excel" to download an Excel file with all bills and items
3. Click "Export to SQL" to download the SQLite database file

### Admin Panel

1. Click the "Admin" tab
2. Enter the admin password (default: set in `app.js`)
3. Access features:
   - **Reset Database**: Completely clear all bills and items
   - **View All Bills**: See all bills and items in a table
   - **Edit Items**: Update PSU code, weight, price, and bill total
   - **Delete Items**: Remove individual items or entire bills

## Technical Details

- **QR Code Library**: html5-qrcode (CDN)
- **Database**: sql.js (SQLite in the browser - local files)
- **Excel Export**: SheetJS (xlsx via CDN)
- **Storage**: LocalStorage (browser-based)
- **No Build Process**: Pure HTML, CSS, and JavaScript - ready to deploy

### SQL.js Setup

The SQL.js library files need to be downloaded locally:

1. Create a `libs/` directory in the project root
2. Download the following files to `libs/`:
   - `sql-wasm.js` from: https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js
   - `sql-wasm.wasm` from: https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.wasm

See `libs/README.md` for detailed download instructions.

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

Note: Camera access is required for QR code scanning functionality.

## Data Persistence

All data is stored locally in your browser's LocalStorage. To backup your data:
1. Use the "Export to SQL" feature in the Dashboard
2. Keep the downloaded .sqlite file as a backup

## Project Structure

```
.
├── index.html      # Main HTML file
├── style.css       # Stylesheet
├── app.js          # Application logic
├── README.md       # This file
└── .gitignore      # Git ignore file
```

## Notes

- The database is stored in browser LocalStorage
- Clearing browser data will delete all bills
- Always export your data regularly for backup
- QR codes should follow the format: `[PSU_CODE][WEIGHT][BRANCH_CODE][UNIQUE_ID]`
- PSU code is extracted from the first 6 digits of the QR code
- Weight is extracted from positions 6-11 of the QR code

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

**Note**: Camera access is required for QR code scanning functionality. HTTPS is required for camera access (automatically provided by GitHub Pages).

## License

This project is open source and available for personal and commercial use.
