// --- Product Data Management (CRUD) ---

const defaultData = {
    jeans: [110, 120, 130, 140, 150],
    shirt: [100, 110, 120, 130],
    't-shirt': [80, 90, 100, 110],
    leggings: [90, 100, 110, 120]
};

let data = loadProductData();
let cart = [];
let total = 0;
let sales = JSON.parse(localStorage.getItem('sales')) || [];

function loadProductData() {
    return JSON.parse(localStorage.getItem('productData')) || defaultData;
}

function saveProductData() {
    localStorage.setItem('productData', JSON.stringify(data));
    renderCategoriesSidebar();
    displayRates(null); 
    populateReportFilters(); 
}

// --- Initialization & UI Rendering ---

function init() {
    renderCategoriesSidebar();
    displayRates(null); // Show all categories on page load
    
    // Bind all main event listeners
    document.getElementById('manage-products-btn').addEventListener('click', openProductModal);
    document.getElementById('close-product-modal').addEventListener('click', () => document.getElementById('product-modal').style.display = 'none');
    
    // Reports Logic
    document.getElementById('reports-btn').addEventListener('click', () => showReports(document.getElementById('report-filter').value)); 
    document.getElementById('report-filter').addEventListener('change', (e) => showReports(e.target.value)); 
    document.getElementById('download-csv-btn').addEventListener('click', downloadFilteredSales); 

    document.getElementById('proceed-btn').addEventListener('click', proceedToCheckout);
    document.getElementById('confirm-payment').addEventListener('click', confirmPayment);
    document.getElementById('send-whatsapp').addEventListener('click', sendWhatsApp);
    document.getElementById('close-modal').addEventListener('click', () => document.getElementById('checkout-modal').style.display = 'none');
    document.getElementById('close-receipt').addEventListener('click', () => document.getElementById('receipt-modal').style.display = 'none');
    document.getElementById('close-reports').addEventListener('click', () => document.getElementById('reports-modal').style.display = 'none');
    document.getElementById('payment-method').addEventListener('change', updateQrDisplay);
    
    // Bind CRUD actions
    document.getElementById('add-category-btn').addEventListener('click', handleAddCategory);
    document.getElementById('add-rate-btn').addEventListener('click', handleAddRate);
}

// MODIFIED: Added "Available Products" link
function renderCategoriesSidebar() {
    const sidebar = document.getElementById('category-list');
    sidebar.innerHTML = '';
    
    // NEW: Add "Available Products" link at the top
    const allProductsLi = document.createElement('li');
    allProductsLi.dataset.category = 'all'; // Unique marker for the 'All' option
    allProductsLi.textContent = 'Available Products';
    allProductsLi.style.fontWeight = '700'; // Make it stand out
    allProductsLi.addEventListener('click', () => displayRates(null));
    sidebar.appendChild(allProductsLi);
    
    // Add individual categories
    Object.keys(data).forEach(category => {
        const li = document.createElement('li');
        li.dataset.category = category;
        li.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        li.addEventListener('click', () => displayRates(category));
        sidebar.appendChild(li);
    });
}

// MODIFIED: Updated active state logic to handle 'all'
function displayRates(category = null) {
    const ratesDiv = document.getElementById('rates');
    ratesDiv.innerHTML = '';
    
    // Handle sidebar activation state
    document.querySelectorAll('#category-list li').forEach(item => item.classList.remove('active'));
    
    if (category) {
         // Activate the specific category
         const activeItem = document.querySelector(`[data-category="${category}"]`);
         if (activeItem) activeItem.classList.add('active');
    } else {
        // Activate "Available Products" when showing all
        const allProductsItem = document.querySelector(`[data-category="all"]`);
        if (allProductsItem) allProductsItem.classList.add('active');
    }

    const categoriesToDisplay = category ? [category] : Object.keys(data);
    
    categoriesToDisplay.sort().forEach(cat => {
        const capitalizedCategory = cat.charAt(0).toUpperCase() + cat.slice(1);
        
        const categoryHeader = document.createElement('h3');
        categoryHeader.textContent = capitalizedCategory;
        ratesDiv.appendChild(categoryHeader);

        const ratesContainer = document.createElement('div');
        ratesContainer.style.display = 'flex';
        ratesContainer.style.flexWrap = 'wrap';
        ratesContainer.style.gap = '15px';
        
        data[cat].sort((a, b) => a - b).forEach(rate => {
            const rateDiv = document.createElement('div');
            rateDiv.className = 'rate';
            rateDiv.textContent = `₹${rate}`;
            rateDiv.addEventListener('click', () => addToCart(cat, rate));
            ratesContainer.appendChild(rateDiv);
        });

        ratesDiv.appendChild(ratesContainer);
    });
}

// --- Cart Logic (Unchanged) ---

function addToCart(category, rate) {
    cart.push({ category, rate });
    total += rate;
    updateCart();
}

function updateCart() {
    const cartItems = document.getElementById('cart-items');
    cartItems.innerHTML = '';
    cart.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = `${item.category.charAt(0).toUpperCase() + item.category.slice(1)} - ₹${item.rate}`;
        cartItems.appendChild(li);
    });
    document.getElementById('total').textContent = total;
}

// --- Checkout & Receipt Logic (Unchanged) ---

function proceedToCheckout() {
    if (cart.length === 0) return alert('Cart is empty!');
    document.getElementById('checkout-modal').style.display = 'flex';
    document.getElementById('checkout-total').textContent = total;
}

function updateQrDisplay(e) {
    const qrDisplay = document.getElementById('qr-display');
    qrDisplay.style.display = e.target.value === 'qr' ? 'block' : 'none';
}

function confirmPayment() {
    const phone = document.getElementById('phone').value;
    const paymentMethod = document.getElementById('payment-method').value; 
    
    if (!phone) return alert('Enter customer phone number!');
    
    const sale = { 
        date: new Date().toISOString(), 
        items: cart.map(item => ({ category: item.category, rate: item.rate })), 
        total, 
        phone,
        paymentMethod 
    };
    sales.push(sale);
    localStorage.setItem('sales', JSON.stringify(sales));
    
    generateReceipt(phone, sale);
    
    // Reset
    cart = [];
    total = 0;
    updateCart();
    document.getElementById('checkout-modal').style.display = 'none';
    document.getElementById('phone').value = ''; 
    saveProductData(); // Ensure filters are updated for new sale
}

// UPDATED: Receipt name changed
function generateReceipt(phone, sale) {
    let receipt = `--- Varuna Collections Receipt ---\n`;
    receipt += `Date: ${new Date(sale.date).toLocaleString()}\n`;
    receipt += `Phone: ${phone}\n`;
    receipt += `Payment: ${sale.paymentMethod === 'qr' ? 'UPI/QR' : 'Cash'}\n\n`; 
    receipt += `Items:\n`;
    sale.items.forEach(item => receipt += `${item.category.padEnd(10, ' ')}: ₹${item.rate.toFixed(2)}\n`);
    receipt += `\n---------------------------\n`;
    receipt += `Total: ₹${sale.total.toFixed(2)}`;
    
    document.getElementById('receipt-content').textContent = receipt;
    document.getElementById('receipt-modal').style.display = 'flex';
}

function sendWhatsApp() {
    const receipt = document.getElementById('receipt-content').textContent;
    // CRITICAL: This gets the phone number entered in the checkout modal.
    const phone = document.getElementById('phone').value; 
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(receipt)}`;
    window.open(url, '_blank');
}

// --- Reports Logic (Unchanged) ---

function populateReportFilters() {
    const filterSelect = document.getElementById('report-filter');
    const currentValue = filterSelect.value;
    filterSelect.innerHTML = '<option value="all">All Time</option>';
    
    if (sales.length === 0) return;

    const uniqueMonths = new Set();
    
    sales.forEach(sale => {
        const date = new Date(sale.date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        uniqueMonths.add(`${year}-${month}`);
    });

    Array.from(uniqueMonths).sort().reverse().forEach(monthYear => {
        const [year, month] = monthYear.split('-');
        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
        
        const option = document.createElement('option');
        option.value = monthYear;
        option.textContent = `${monthName} ${year}`;
        filterSelect.appendChild(option);
    });
    
    if (currentValue && Array.from(uniqueMonths).includes(currentValue)) {
        filterSelect.value = currentValue;
    }
}

function showReports(filterValue) {
    const reportsDiv = document.getElementById('reports-content');
    reportsDiv.innerHTML = '';

    if (sales.length === 0) {
        reportsDiv.innerHTML = '<h3>Sales Reports</h3><p>No sales recorded yet.</p>';
        document.getElementById('reports-modal').style.display = 'flex';
        return;
    }
    
    let filteredSales = sales;
    if (filterValue && filterValue !== 'all') {
        filteredSales = sales.filter(sale => {
            const saleDate = new Date(sale.date);
            const saleMonthYear = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
            return saleMonthYear === filterValue;
        });
        
        if (filteredSales.length === 0) {
            reportsDiv.innerHTML = '<h3>Detailed Sales History</h3><p>No sales recorded for the selected period.</p>';
            reportsDiv.innerHTML += '<h3>Revenue Aggregation</h3><p>No sales data.</p>';
            document.getElementById('reports-modal').style.display = 'flex';
            return;
        }
    }
    
    window.currentFilteredSales = filteredSales;

    reportsDiv.innerHTML += '<h3>Detailed Sales History</h3>';
    
    let salesHtml = `
        <div style="max-height: 300px; overflow-y: auto; margin-bottom: 20px;">
        <table>
            <thead>
                <tr>
                    <th>Date/Time</th>
                    <th>Phone</th>
                    <th>Payment</th>
                    <th>Products</th>
                    <th>Total (₹)</th>
                </tr>
            </thead>
            <tbody>
    `;

    filteredSales.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(sale => {
        const saleDate = new Date(sale.date);
        const date = saleDate.toLocaleString().substring(0, saleDate.toLocaleString().lastIndexOf(':'));
        
        const paymentText = sale.paymentMethod === 'qr' ? 'UPI/QR' : 'Cash';
        const itemsList = sale.items.map(item => 
            `<span style="white-space: nowrap;">${item.category}: ₹${item.rate}</span>`
        ).join('<br>');
        
        salesHtml += `
            <tr>
                <td>${date}</td>
                <td>${sale.phone}</td>
                <td>${paymentText}</td>
                <td>${itemsList}</td>
                <td style="font-weight: 600;">₹${sale.total.toFixed(2)}</td>
            </tr>
        `;
    });
    
    salesHtml += '</tbody></table></div>';
    reportsDiv.innerHTML += salesHtml;


    reportsDiv.innerHTML += '<h3>Revenue Aggregation (By Day, Month, Year)</h3>';
    reportsDiv.innerHTML += '<p class="note-profit">Note: True Profit calculation requires a **Cost Price** or **Margin**. This report shows **Total Revenue** (Sale Amount) for the selected filter.</p>';

    const byDay = {};
    const byMonth = {};
    const byYear = {};
    
    filteredSales.forEach(sale => {
        const date = new Date(sale.date);
        const day = date.toDateString();
        const month = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const year = date.getFullYear();
        
        byDay[day] = (byDay[day] || 0) + sale.total;
        byMonth[month] = (byMonth[month] || 0) + sale.total;
        byYear[year] = (byYear[year] || 0) + sale.total;
    });
    
    reportsDiv.innerHTML += '<h4>By Day</h4>' + Object.entries(byDay).map(([k, v]) => `${k}: **₹${v.toFixed(2)}**`).join('<br>');
    reportsDiv.innerHTML += '<h4>By Month</h4>' + Object.entries(byMonth).map(([k, v]) => `${k}: **₹${v.toFixed(2)}**`).join('<br>');
    reportsDiv.innerHTML += '<h4>By Year</h4>' + Object.entries(byYear).map(([k, v]) => `${k}: **₹${v.toFixed(2)}**`).join('<br>');
    
    document.getElementById('reports-modal').style.display = 'flex';
}

function downloadFilteredSales() {
    const salesToDownload = window.currentFilteredSales || sales;
    const filterValue = document.getElementById('report-filter').value;
    
    if (salesToDownload.length === 0) {
        alert("No sales data to download for the current filter.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Time,Phone Number,Payment Method,Items,Total (INR)\n";
    
    salesToDownload.forEach(sale => {
        const saleDate = new Date(sale.date);
        const date = saleDate.toLocaleDateString();
        const time = saleDate.toLocaleTimeString();
        const payment = sale.paymentMethod === 'qr' ? 'UPI/QR' : 'Cash';
        
        const itemsString = sale.items.map(item => 
            `${item.category} @ ${item.rate}`
        ).join(' | ');
        
        const total = sale.total.toFixed(2);
        
        csvContent += `${date},${time},${sale.phone},${payment},"${itemsString}",${total}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const filename = filterValue === 'all' ? 'Sales_Report_All_Time.csv' : `Sales_Report_${filterValue}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// --- CRUD Functions for Product Management (Unchanged) ---

function openProductModal() {
    renderProductManagementUI();
    document.getElementById('product-modal').style.display = 'flex';
}

function renderProductManagementUI() {
    const productListView = document.getElementById('product-list-view');
    const categorySelect = document.getElementById('select-category-for-rate');
    productListView.innerHTML = '';
    categorySelect.innerHTML = '';

    Object.keys(data).sort().forEach(category => {
        const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);
        
        const option = document.createElement('option');
        option.value = category;
        option.textContent = capitalizedCategory;
        categorySelect.appendChild(option);

        const groupDiv = document.createElement('div');
        groupDiv.className = 'product-group';
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'category-header';
        headerDiv.innerHTML = `
            <span>${capitalizedCategory} (${data[category].length} rates)</span>
            <button class="delete-btn" data-type="category" data-key="${category}">Delete Category</button>
        `;
        groupDiv.appendChild(headerDiv);
        
        data[category].sort((a, b) => a - b).forEach(rate => {
            const rateItem = document.createElement('div');
            rateItem.className = 'rate-item';
            rateItem.innerHTML = `
                <span>₹${rate}</span>
                <button class="delete-btn" data-type="rate" data-category="${category}" data-rate="${rate}">Delete Rate</button>
            `;
            groupDiv.appendChild(rateItem);
        });

        productListView.appendChild(groupDiv);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteProduct);
    });
}

function handleAddCategory() {
    const nameInput = document.getElementById('new-category-name');
    let categoryName = nameInput.value.trim().toLowerCase();
    
    if (!categoryName) return alert('Category name cannot be empty!');
    if (data[categoryName]) return alert(`Category "${categoryName}" already exists!`);
    
    data[categoryName] = [];
    saveProductData();
    nameInput.value = '';
    
    alert(`Category "${categoryName}" added. Add rates next!`);
    renderProductManagementUI(); 
}

function handleAddRate() {
    const categorySelect = document.getElementById('select-category-for-rate');
    const rateInput = document.getElementById('new-rate-value');
    
    const category = categorySelect.value;
    const rate = parseInt(rateInput.value);
    
    if (!category) return alert('Select a category first.');
    if (isNaN(rate) || rate <= 0) return alert('Please enter a valid rate (number > 0).');
    if (data[category].includes(rate)) alert(`Rate ₹${rate} already exists in ${category}!`);
    
    data[category].push(rate);
    saveProductData();
    rateInput.value = '';
    
    alert(`Rate ₹${rate} added to ${category}.`);
    renderProductManagementUI(); 
}

function handleDeleteProduct(event) {
    const target = event.target;
    const type = target.dataset.type;
    const category = target.dataset.category;

    if (type === 'category') {
        if (!confirm(`Are you sure you want to delete the entire category "${category}"? This cannot be undone.`)) {
            return;
        }
        delete data[category];
        alert(`Category "${category}" deleted.`);
    } else if (type === 'rate') {
        const rate = parseInt(target.dataset.rate);
        
        if (!confirm(`Are you sure you want to delete rate ₹${rate} from ${category}?`)) {
            return;
        }
        const index = data[category].indexOf(rate);
        if (index > -1) {
            data[category].splice(index, 1);
        }
        alert(`Rate ₹${rate} deleted from ${category}.`);
        
        if (data[category].length === 0) {
             delete data[category];
             alert(`Category "${category}" is now empty and has been removed.`);
        }
    }

    saveProductData();
    renderProductManagementUI(); 
}

// Run initialization once the script loads
init();
