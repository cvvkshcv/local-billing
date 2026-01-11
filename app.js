// Global variables
let db = null;
let html5QrCode = null;
let scannerActive = false;
let currentBillItems = [];
let lastScannedCode = null;
let scanCooldown = false;
let isAdminLoggedIn = false;
const ADMIN_PASSWORD = 'cvvkshcv@gmail.com'; // Change this to your desired password

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    await initDatabase();
    setupEventListeners();
    loadDashboard();
});

// Initialize SQLite database
async function initDatabase() {
    try {
        // Check if initSqlJs is available
        if (typeof initSqlJs === 'undefined') {
            throw new Error('SQL.js library not loaded. Please check if sql-wasm.js is loaded correctly.');
        }
        
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
        });
        
        // Try to load existing database from localStorage
        const savedDb = localStorage.getItem('billing_db');
        if (savedDb) {
            const buffer = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
            db = new SQL.Database(buffer);
            // Check and migrate schema if needed
            migrateDatabaseIfNeeded();
        } else {
            db = new SQL.Database();
            // Create tables - each row represents one item in a bill
            createTables();
            saveDatabase();
        }
    } catch (error) {
        console.error('Database initialization error:', error);
        alert('Failed to initialize database. Please refresh the page.');
    }
}

// Create tables with new schema
function createTables() {
    // Bills table - stores bill information
    db.run(`
        CREATE TABLE IF NOT EXISTS bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_date TEXT NOT NULL,
            total_amount REAL NOT NULL
        )
    `);
    
    // Bill items table - stores individual items in each bill
    db.run(`
        CREATE TABLE IF NOT EXISTS bill_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_id INTEGER NOT NULL,
            product_id TEXT NOT NULL,
            psu_code TEXT NOT NULL,
            weight TEXT NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
        )
    `);
}

// Migrate database schema if needed
function migrateDatabaseIfNeeded() {
    try {
        // Check if the bills table exists
        const billsTableInfo = db.exec("PRAGMA table_info(bills)");
        const billItemsTableInfo = db.exec("PRAGMA table_info(bill_items)");
        
        // Check if both tables exist with correct schema
        if (billsTableInfo.length === 0 || billsTableInfo[0].values.length === 0) {
            // Tables don't exist, create them
            createTables();
            saveDatabase();
            return;
        }
        
        // Check if bill_items table exists
        if (billItemsTableInfo.length === 0 || billItemsTableInfo[0].values.length === 0) {
            // bill_items table doesn't exist, need to create it
            console.log('Creating bill_items table...');
            db.run(`
                CREATE TABLE IF NOT EXISTS bill_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bill_id INTEGER NOT NULL,
                    product_id TEXT NOT NULL,
                    psu_code TEXT NOT NULL,
                    weight TEXT NOT NULL,
                    price REAL NOT NULL,
                    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
                )
            `);
            saveDatabase();
            return;
        }
        
        // Check if bills table has old schema (items column)
        const billsColumns = billsTableInfo[0].values.map(row => row[1]);
        const hasItemsColumn = billsColumns.includes('items');
        
        if (hasItemsColumn) {
            // Old schema detected, migrate to new schema
            console.log('Migrating database to new schema...');
            
            // Drop old tables
            db.run("DROP TABLE IF EXISTS bill_items");
            db.run("DROP TABLE IF EXISTS bills");
            
            // Create new tables with new schema
            createTables();
            
            saveDatabase();
            console.log('Database migration completed');
        }
    } catch (error) {
        console.error('Migration error:', error);
        // If migration fails, recreate the database
        try {
            db.run("DROP TABLE IF EXISTS bill_items");
            db.run("DROP TABLE IF EXISTS bills");
            createTables();
            saveDatabase();
        } catch (e) {
            console.error('Failed to recreate database:', e);
        }
    }
}

// Save database to localStorage
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Array.from(data);
        localStorage.setItem('billing_db', btoa(String.fromCharCode.apply(null, buffer)));
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.target.dataset.page;
            switchPage(page);
        });
    });

    // QR Scanner
    document.getElementById('start-scanner').addEventListener('click', startScanner);
    document.getElementById('stop-scanner').addEventListener('click', stopScanner);

    // Payment checkbox
    document.getElementById('payment-done').addEventListener('change', handlePaymentCheckbox);

    // Bill generation
    document.getElementById('generate-bill').addEventListener('click', generateBill);

    // Export buttons
    document.getElementById('export-excel').addEventListener('click', exportToExcel);
    document.getElementById('export-sql').addEventListener('click', exportToSQL);

    // Admin functionality
    document.getElementById('admin-login-btn').addEventListener('click', handleAdminLogin);
    document.getElementById('admin-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAdminLogin();
        }
    });
    document.getElementById('admin-logout').addEventListener('click', handleAdminLogout);
    document.getElementById('reset-database').addEventListener('click', resetDatabase);
    document.querySelector('.close-modal').addEventListener('click', closeEditModal);
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    document.getElementById('edit-form').addEventListener('submit', handleEditSubmit);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('edit-modal');
        if (e.target === modal) {
            closeEditModal();
        }
    });
}

// Handle payment checkbox change
function handlePaymentCheckbox() {
    // Update button state based on payment checkbox and other conditions
    updateTotal();
}

// Switch between pages
function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`${page}-page`).classList.add('active');
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    if (page === 'dashboard') {
        loadDashboard();
    } else if (page === 'admin') {
        checkAdminAccess();
    }
}

// Start QR Scanner
async function startScanner() {
    if (scannerActive) return;
    
    try {
        html5QrCode = new Html5Qrcode("qr-reader");
        
        await html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                disableFlip: false
            },
            (decodedText, decodedResult) => {
                // Wrap in try-catch to prevent any errors from causing issues
                try {
                    onScanSuccess(decodedText, decodedResult);
                } catch (error) {
                    console.error('Error handling scan:', error);
                }
            },
            (errorMessage) => {
                // Ignore continuous errors - don't do anything that could cause refresh
            }
        );
        
        scannerActive = true;
        document.getElementById('start-scanner').style.display = 'none';
        document.getElementById('stop-scanner').style.display = 'inline-block';
    } catch (err) {
        console.error('Scanner error:', err);
        alert('Failed to start scanner. Please ensure camera permissions are granted.');
    }
}

// Stop QR Scanner
async function stopScanner() {
    if (!scannerActive || !html5QrCode) return;
    
    try {
        await html5QrCode.stop();
        html5QrCode.clear();
        scannerActive = false;
        document.getElementById('start-scanner').style.display = 'inline-block';
        document.getElementById('stop-scanner').style.display = 'none';
    } catch (err) {
        console.error('Stop scanner error:', err);
    }
}

// Handle successful QR scan
function onScanSuccess(decodedText, decodedResult) {
    // Prevent multiple rapid scans of the same code
    const productId = decodedText.trim();
    
    // Check if this is the same code as last scan (within cooldown period)
    if (scanCooldown || lastScannedCode === productId) {
        return;
    }
    
    // Set cooldown to prevent rapid re-scanning
    scanCooldown = true;
    lastScannedCode = productId;
    
    // Add item to bill (use setTimeout to prevent blocking)
    setTimeout(() => {
        addItemToBill(productId);
    }, 0);
    
    // Reset cooldown after 2 seconds
    setTimeout(() => {
        scanCooldown = false;
        lastScannedCode = null;
    }, 2000);
}

// Handle scan error
function onScanError(errorMessage) {
    // Ignore continuous errors
}

// Add item to bill
function addItemToBill(productId) {
    // 17832500300110126122316563
    /*
      this is product code.
      Here `178325` is psu code,
      `00300` is weight &
      `11001` is branch code &
      rest of the value is unique id.
      Write code to parse this product code and get the product name.
    */
    const psuCode = productId.substring(0, 6);
    const weight = productId.substring(6, 11);
    const branchCode = productId.substring(11, 15);
    const uniqueId = productId.substring(15);
    console.log(psuCode, weight, branchCode, uniqueId);
    
    // Check if item already exists
    const existingItem = currentBillItems.find(item => item.productId === productId);
    if (existingItem) {
        // Don't show alert for duplicate, just return silently
        return;
    }
    
    const newItem = {
        productId: productId,
        psuCode: psuCode,
        weight: weight,
        price: 0
    };
    
    currentBillItems.push(newItem);
    renderBillItems();
}

// Render bill items
function renderBillItems() {
    const container = document.getElementById('bill-items');
    const header = container.querySelector('.bill-header');
    container.innerHTML = '';
    if (header) container.appendChild(header);
    
    currentBillItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'bill-item';
        itemDiv.innerHTML = `
            <span class="product-name">PSU Code: ${item.psuCode} (Weight: ${item.weight})</span>
            <div class="price-input-wrapper">
                <label class="price-label">Price:</label>
                <input type="number" 
                       class="price-input" 
                       data-index="${index}" 
                       value="${item.price}" 
                       step="0.01" 
                       min="0" 
                       placeholder="Enter price">
            </div>
            <button class="btn btn-danger remove-item" data-index="${index}">Remove</button>
        `;
        container.appendChild(itemDiv);
    });
    
    // Add event listeners
    container.querySelectorAll('.price-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            currentBillItems[index].price = parseFloat(e.target.value) || 0;
            updateTotal();
        });
    });
    
    container.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            currentBillItems.splice(index, 1);
            renderBillItems();
            updateTotal();
        });
    });
    
    updateTotal();
}

// Update total amount
function updateTotal() {
    const total = currentBillItems.reduce((sum, item) => sum + (item.price || 0), 0);
    document.getElementById('total-amount').textContent = total.toFixed(2);
    
    // Disable generate button if no items or total is 0, or if payment not confirmed
    const generateBtn = document.getElementById('generate-bill');
    const paymentChecked = document.getElementById('payment-done').checked;
    const hasItems = currentBillItems.length > 0;
    const hasTotal = total > 0;
    
    generateBtn.disabled = !(hasItems && hasTotal && paymentChecked);
}

// Generate bill
function generateBill() {
    if (currentBillItems.length === 0) {
        alert('Please add at least one item to the bill.');
        return;
    }
    
    const total = currentBillItems.reduce((sum, item) => sum + (item.price || 0), 0);
    if (total === 0) {
        alert('Please enter prices for all items.');
        return;
    }
    
    const billDate = new Date().toISOString();
    
    // Insert bill record
    db.run(
        `INSERT INTO bills (bill_date, total_amount) 
         VALUES (?, ?)`,
        [billDate, total]
    );
    
    // Get the last inserted bill ID
    const billIdResult = db.exec("SELECT last_insert_rowid() as id");
    const billId = billIdResult[0].values[0][0];
    
    // Insert each item into bill_items table with foreign key relationship
    currentBillItems.forEach(item => {
        db.run(
            `INSERT INTO bill_items (bill_id, product_id, psu_code, weight, price) 
             VALUES (?, ?, ?, ?, ?)`,
            [billId, item.productId, item.psuCode, item.weight, item.price]
        );
    });
    
    saveDatabase();
    
    alert(`Bill generated successfully! Total: ₹${total.toFixed(2)}`);
    
    // Clear current bill and reset payment checkbox
    currentBillItems = [];
    document.getElementById('payment-done').checked = false;
    document.getElementById('generate-bill').disabled = true;
    renderBillItems();
}

// Load dashboard statistics
function loadDashboard() {
    if (!db) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Items sold today - count items from bill_items table
    const itemsTodayResult = db.exec(`
        SELECT COUNT(*) as count 
        FROM bill_items bi
        JOIN bills b ON bi.bill_id = b.id
        WHERE DATE(b.bill_date) = DATE('${today}')
    `);
    const itemsSoldToday = itemsTodayResult.length > 0 && itemsTodayResult[0].values.length > 0 
        ? itemsTodayResult[0].values[0][0] : 0;
    document.getElementById('items-sold-today').textContent = itemsSoldToday;
    
    // Revenue today
    const revenueTodayResult = db.exec(`
        SELECT COALESCE(SUM(total_amount), 0) as total 
        FROM bills 
        WHERE DATE(bill_date) = DATE('${today}')
    `);
    const revenueToday = revenueTodayResult.length > 0 && revenueTodayResult[0].values.length > 0
        ? revenueTodayResult[0].values[0][0] : 0;
    document.getElementById('revenue-today').textContent = `₹${parseFloat(revenueToday).toFixed(2)}`;
    
    // Bills today
    const billsTodayResult = db.exec(`
        SELECT COUNT(*) as count 
        FROM bills 
        WHERE DATE(bill_date) = DATE('${today}')
    `);
    const billsToday = billsTodayResult.length > 0 && billsTodayResult[0].values.length > 0
        ? billsTodayResult[0].values[0][0] : 0;
    document.getElementById('bills-today').textContent = billsToday;
    
    // Total revenue
    const totalRevenueResult = db.exec(`
        SELECT COALESCE(SUM(total_amount), 0) as total 
        FROM bills
    `);
    const totalRevenue = totalRevenueResult.length > 0 && totalRevenueResult[0].values.length > 0
        ? totalRevenueResult[0].values[0][0] : 0;
    document.getElementById('total-revenue').textContent = `₹${parseFloat(totalRevenue).toFixed(2)}`;
    
    // Load recent bills
    loadRecentBills();
}

// Load recent bills
function loadRecentBills() {
    if (!db) return;
    
    const result = db.exec(`
        SELECT b.id, b.bill_date, b.total_amount, COUNT(bi.id) as item_count
        FROM bills b
        LEFT JOIN bill_items bi ON b.id = bi.bill_id
        GROUP BY b.id, b.bill_date, b.total_amount
        ORDER BY b.bill_date DESC 
        LIMIT 10
    `);
    
    const container = document.getElementById('recent-bills-list');
    
    if (result.length === 0 || result[0].values.length === 0) {
        container.innerHTML = '<div class="empty-state">No bills found</div>';
        return;
    }
    
    container.innerHTML = '';
    result[0].values.forEach(row => {
        const [id, date, amount, itemCount] = row;
        const billDate = new Date(date).toLocaleString();
        const billDiv = document.createElement('div');
        billDiv.className = 'bill-list-item';
        billDiv.innerHTML = `
            <div class="bill-info">
                <div>Bill #${id} (${itemCount} items)</div>
                <div class="bill-date">${billDate}</div>
            </div>
            <div class="bill-amount">₹${parseFloat(amount).toFixed(2)}</div>
        `;
        container.appendChild(billDiv);
    });
}

// Export to Excel
function exportToExcel() {
    if (!db) {
        alert('Database not initialized');
        return;
    }
    
    try {
        // Get all bill items with complete bill information - combined view
        const combinedResult = db.exec(`
            SELECT 
                b.id as bill_id,
                b.bill_date,
                b.total_amount,
                bi.product_id,
                bi.psu_code,
                bi.weight,
                bi.price
            FROM bill_items bi
            JOIN bills b ON bi.bill_id = b.id
            ORDER BY b.bill_date DESC, b.id, bi.id
        `);
        
        if (combinedResult.length === 0 || combinedResult[0].values.length === 0) {
            alert('No data to export');
            return;
        }
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Combined sheet with bill and item information in meaningful rows
        const combinedData = [
            ['Bill ID', 'Bill Date', 'Bill Total Amount', 'Product ID', 'PSU Code', 'Weight', 'Item Price']
        ];
        
        if (combinedResult[0].values.length > 0) {
            combinedResult[0].values.forEach(row => {
                const [billId, billDate, totalAmount, productId, psuCode, weight, price] = row;
                // Format date for better readability
                const formattedDate = new Date(billDate).toLocaleString();
                combinedData.push([
                    billId,
                    formattedDate,
                    parseFloat(totalAmount).toFixed(2),
                    productId,
                    psuCode,
                    weight,
                    parseFloat(price).toFixed(2)
                ]);
            });
        }
        
        const combinedWs = XLSX.utils.aoa_to_sheet(combinedData);
        
        // Set column widths for better readability
        const colWidths = [
            { wch: 10 }, // Bill ID
            { wch: 20 }, // Bill Date
            { wch: 18 }, // Bill Total Amount
            { wch: 25 }, // Product ID
            { wch: 12 }, // PSU Code
            { wch: 10 }, // Weight
            { wch: 12 }  // Item Price
        ];
        combinedWs['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, combinedWs, 'Bills & Items');
        
        // Export
        const fileName = `billing_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        alert('Data exported to Excel successfully!');
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export data. Please try again.');
    }
}

// Export to SQL
function exportToSQL() {
    if (!db) {
        alert('Database not initialized');
        return;
    }
    
    try {
        const sql = db.export();
        const blob = new Blob([sql], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `billing_export_${new Date().toISOString().split('T')[0]}.sqlite`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('Database exported successfully!');
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export database. Please try again.');
    }
}

// Admin Functions
function checkAdminAccess() {
    if (!isAdminLoggedIn) {
        document.getElementById('admin-login').style.display = 'block';
        document.getElementById('admin-content').style.display = 'none';
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-error').textContent = '';
    } else {
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-content').style.display = 'block';
        loadAdminTable();
    }
}

function handleAdminLogin() {
    const password = document.getElementById('admin-password').value;
    const errorMsg = document.getElementById('admin-error');
    
    if (password === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-content').style.display = 'block';
        document.getElementById('admin-password').value = '';
        errorMsg.textContent = '';
        loadAdminTable();
    } else {
        errorMsg.textContent = 'Incorrect password. Please try again.';
        document.getElementById('admin-password').value = '';
    }
}

function handleAdminLogout() {
    isAdminLoggedIn = false;
    checkAdminAccess();
}

function resetDatabase() {
    if (!confirm('Are you sure you want to reset the database? This action cannot be undone!')) {
        return;
    }
    
    try {
        // Drop all tables
        db.run("DROP TABLE IF EXISTS bill_items");
        db.run("DROP TABLE IF EXISTS bills");
        
        // Recreate tables
        createTables();
        saveDatabase();
        
        alert('Database reset successfully!');
        loadAdminTable();
        loadDashboard(); // Refresh dashboard if open
    } catch (error) {
        console.error('Reset error:', error);
        alert('Failed to reset database. Please try again.');
    }
}

function loadAdminTable() {
    if (!db) return;
    
    try {
        // Get all bill items with bill information
        const result = db.exec(`
            SELECT 
                bi.id as item_id,
                b.id as bill_id,
                b.bill_date,
                b.total_amount,
                bi.product_id,
                bi.psu_code,
                bi.weight,
                bi.price
            FROM bill_items bi
            JOIN bills b ON bi.bill_id = b.id
            ORDER BY b.bill_date DESC, b.id, bi.id
        `);
        
        const tbody = document.getElementById('admin-table-body');
        tbody.innerHTML = '';
        
        if (result.length === 0 || result[0].values.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No bills found</td></tr>';
            return;
        }
        
        result[0].values.forEach(row => {
            const [itemId, billId, billDate, totalAmount, productId, psuCode, weight, price] = row;
            const formattedDate = new Date(billDate).toLocaleString();
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${billId}</td>
                <td>${formattedDate}</td>
                <td>₹${parseFloat(totalAmount).toFixed(2)}</td>
                <td>${productId}</td>
                <td>${psuCode}</td>
                <td>${weight}</td>
                <td>₹${parseFloat(price).toFixed(2)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-small edit-btn" data-item-id="${itemId}" data-bill-id="${billId}">Edit</button>
                        <button class="btn btn-danger btn-small delete-btn" data-item-id="${itemId}" data-bill-id="${billId}">Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Add event listeners for edit and delete buttons
        tbody.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.itemId;
                const billId = e.target.dataset.billId;
                openEditModal(itemId, billId);
            });
        });
        
        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.itemId;
                const billId = e.target.dataset.billId;
                deleteBillItem(itemId, billId);
            });
        });
    } catch (error) {
        console.error('Error loading admin table:', error);
        alert('Failed to load bills. Please try again.');
    }
}

function deleteBillItem(itemId, billId) {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone!')) {
        return;
    }
    
    try {
        // Delete the item
        db.run('DELETE FROM bill_items WHERE id = ?', [itemId]);
        
        // Check if bill has any remaining items
        const remainingItems = db.exec('SELECT COUNT(*) as count FROM bill_items WHERE bill_id = ?', [billId]);
        const count = remainingItems.length > 0 && remainingItems[0].values.length > 0 
            ? remainingItems[0].values[0][0] : 0;
        
        // If no items left, delete the bill and recalculate total
        if (count === 0) {
            db.run('DELETE FROM bills WHERE id = ?', [billId]);
        } else {
            // Recalculate bill total
            const itemsResult = db.exec('SELECT SUM(price) as total FROM bill_items WHERE bill_id = ?', [billId]);
            const newTotal = itemsResult.length > 0 && itemsResult[0].values.length > 0
                ? itemsResult[0].values[0][0] || 0 : 0;
            db.run('UPDATE bills SET total_amount = ? WHERE id = ?', [newTotal, billId]);
        }
        
        saveDatabase();
        loadAdminTable();
        loadDashboard(); // Refresh dashboard if open
        alert('Item deleted successfully!');
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete item. Please try again.');
    }
}

function openEditModal(itemId, billId) {
    try {
        // Get item details
        const itemResult = db.exec('SELECT * FROM bill_items WHERE id = ?', [itemId]);
        const billResult = db.exec('SELECT * FROM bills WHERE id = ?', [billId]);
        
        if (itemResult.length === 0 || itemResult[0].values.length === 0) {
            alert('Item not found');
            return;
        }
        
        const item = itemResult[0].values[0];
        const bill = billResult[0].values[0];
        
        // Populate form
        // item columns: id, bill_id, product_id, psu_code, weight, price
        // bill columns: id, bill_date, total_amount
        document.getElementById('edit-item-id').value = itemId;
        document.getElementById('edit-bill-id').value = billId;
        document.getElementById('edit-product-id').value = item[2]; // product_id
        document.getElementById('edit-psu-code').value = item[3]; // psu_code
        document.getElementById('edit-weight').value = item[4]; // weight
        document.getElementById('edit-price').value = item[5]; // price
        document.getElementById('edit-bill-total').value = bill[2]; // total_amount
        
        // Show modal
        document.getElementById('edit-modal').style.display = 'block';
    } catch (error) {
        console.error('Error opening edit modal:', error);
        alert('Failed to load item details. Please try again.');
    }
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    document.getElementById('edit-form').reset();
}

function handleEditSubmit(e) {
    e.preventDefault();
    
    try {
        const itemId = document.getElementById('edit-item-id').value;
        const billId = document.getElementById('edit-bill-id').value;
        const psuCode = document.getElementById('edit-psu-code').value;
        const weight = document.getElementById('edit-weight').value;
        const price = parseFloat(document.getElementById('edit-price').value);
        const billTotal = parseFloat(document.getElementById('edit-bill-total').value);
        
        // Update item
        db.run('UPDATE bill_items SET psu_code = ?, weight = ?, price = ? WHERE id = ?', 
            [psuCode, weight, price, itemId]);
        
        // Recalculate bill total from all items
        const itemsResult = db.exec('SELECT SUM(price) as total FROM bill_items WHERE bill_id = ?', [billId]);
        const calculatedTotal = itemsResult.length > 0 && itemsResult[0].values.length > 0
            ? itemsResult[0].values[0][0] || 0 : 0;
        
        // Update bill total
        db.run('UPDATE bills SET total_amount = ? WHERE id = ?', [calculatedTotal, billId]);
        
        saveDatabase();
        closeEditModal();
        loadAdminTable();
        loadDashboard(); // Refresh dashboard if open
        alert('Item updated successfully!');
    } catch (error) {
        console.error('Update error:', error);
        alert('Failed to update item. Please try again.');
    }
}
