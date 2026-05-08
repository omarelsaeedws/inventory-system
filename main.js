// --- Helper Functions ---

const generateUUID = () => {
    return 'id-' + Math.random().toString(36).substr(2, 9);
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);
};

const isReturnedStatus = (status) => status === 'returned' || status === 'returned_no_receive';

// --- Storage Logic ---

const loadData = (key) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};

const saveData = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- State ---

let products = loadData('inventory_products');
let orders = loadData('inventory_orders');

// --- Navigation Logic ---

const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const targetSection = link.getAttribute('data-section');
        
        // Update active link
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Show target section
        sections.forEach(s => {
            s.classList.remove('active');
            if (s.id === targetSection) s.classList.add('active');
        });

        // Close sidebar on mobile
        if (window.innerWidth <= 992) {
            // Optional: sidebar toggle logic
        }
    });
});

// --- Modal Logic ---

window.openModal = (id) => {
    document.getElementById(id).classList.add('active');
};

window.closeModal = (id) => {
    document.getElementById(id).classList.remove('active');
    if (id === 'product-modal') {
        document.getElementById('product-form').reset();
        document.getElementById('product-id').value = '';
        document.getElementById('product-modal-title').innerText = 'إضافة منتج جديد';
    }
    if (id === 'order-modal') {
        document.getElementById('order-form').reset();
    }
};

// --- Product Management ---

const productForm = document.getElementById('product-form');
productForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value;
    const stock = parseInt(document.getElementById('product-stock').value) || 0;
    const cost = parseFloat(document.getElementById('product-cost').value);
    const selling = parseFloat(document.getElementById('product-selling').value);

    if (id) {
        // Update
        const index = products.findIndex(p => p.id === id);
        products[index] = { ...products[index], name, stock, cost, selling };
    } else {
        // Create
        const newProduct = {
            id: generateUUID(),
            name,
            stock,
            cost,
            selling,
            createdAt: new Date().toISOString()
        };
        products.push(newProduct);
    }

    saveData('inventory_products', products);
    renderProducts();
    updateProductSelect();
    updateDashboard();
    closeModal('product-modal');
});

const editProduct = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-stock').value = product.stock || 0;
    document.getElementById('product-cost').value = product.cost;
    document.getElementById('product-selling').value = product.selling;
    document.getElementById('product-modal-title').innerText = 'تعديل منتج';
    
    openModal('product-modal');
};

const deleteProduct = (id) => {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟ سيتم حذف جميع الطلبات المرتبطة به أيضاً.')) {
        products = products.filter(p => p.id !== id);
        orders = orders.filter(o => o.productId !== id);
        saveData('inventory_products', products);
        saveData('inventory_orders', orders);
        renderProducts();
        renderOrders();
        updateProductSelect();
        updateDashboard();
    }
};

const renderProducts = () => {
    const tbody = document.querySelector('#products-table tbody');
    tbody.innerHTML = '';

    products.forEach(p => {
        const stock = p.stock || 0;
        const totalCostValue = stock * p.cost;
        const profitPerPiece = p.selling - p.cost;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.name}</td>
            <td>${stock}</td>
            <td>${formatCurrency(p.cost)}</td>
            <td>${formatCurrency(p.selling)}</td>
            <td>${formatCurrency(totalCostValue)}</td>
            <td style="color: var(--success)">${formatCurrency(profitPerPiece)}</td>
            <td>
                <button class="btn-icon edit-product-btn" data-id="${p.id}" title="تعديل"><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-danger-icon delete-product-btn" data-id="${p.id}" title="حذف"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

// --- Order Management ---

const orderForm = document.getElementById('order-form');
const updateProductSelect = () => {
    const select = document.getElementById('order-product-id');
    const currentValue = select.value;
    select.innerHTML = '<option value="">اختر منتجاً...</option>';
    products.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.innerText = p.name;
        select.appendChild(option);
    });
    select.value = currentValue;
};

orderForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const orderDate = document.getElementById('order-date').value;
    const customerName = document.getElementById('order-customer').value;
    const productId = document.getElementById('order-product-id').value;
    const quantity = parseInt(document.getElementById('order-quantity').value);
    const shippingCollected = parseFloat(document.getElementById('order-shipping-collected').value) || 0;
    const shippingActual = parseFloat(document.getElementById('order-shipping-actual').value) || 0;
    const discount = parseFloat(document.getElementById('order-discount').value) || 0;
    const status = document.getElementById('order-status').value;

    const product = products.find(p => p.id === productId);
    if (!product) return alert('المنتج المختار غير موجود');
    
    const stock = product.stock || 0;
    if (stock < quantity && !isReturnedStatus(status)) {
        return alert('الكمية المطلوبة غير متوفرة في المخزن!');
    }

    // Deduct stock
    if (!isReturnedStatus(status)) {
        product.stock = stock - quantity;
        saveData('inventory_products', products);
        renderProducts();
    }

    const newOrder = {
        id: generateUUID(),
        orderDate,
        customerName,
        productId,
        productName: product.name,
        quantity,
        shippingCollected,
        shippingActual,
        discount,
        status,
        costPrice: product.cost,
        sellingPrice: product.selling,
        createdAt: new Date().toISOString()
    };

    orders.push(newOrder);
    saveData('inventory_orders', orders);
    renderOrders();
    updateDashboard();
    closeModal('order-modal');
});

const changeOrderStatus = (id, newStatus) => {
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
        const oldStatus = orders[index].status;
        const p = products.find(prod => prod.id === orders[index].productId);
        
        if (p) {
            const currentStock = p.stock || 0;
            const wasReturned = isReturnedStatus(oldStatus);
            const isNowReturned = isReturnedStatus(newStatus);
            
            if (!wasReturned && isNowReturned) {
                // Add stock back
                p.stock = currentStock + orders[index].quantity;
            } else if (wasReturned && !isNowReturned) {
                // Deduct stock
                if (currentStock < orders[index].quantity) {
                    return alert('الكمية المتوفرة غير كافية لتحويل الحالة من مرتجع.');
                }
                p.stock = currentStock - orders[index].quantity;
            }
            saveData('inventory_products', products);
            renderProducts();
        }

        orders[index].status = newStatus;
        saveData('inventory_orders', orders);
        renderOrders();
        updateDashboard();
    }
};

const deleteOrder = (id) => {
    if (confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
        const o = orders.find(ord => ord.id === id);
        if (o && !isReturnedStatus(o.status)) {
            const p = products.find(prod => prod.id === o.productId);
            if (p) {
                p.stock = (p.stock || 0) + o.quantity;
                saveData('inventory_products', products);
                renderProducts();
            }
        }
        orders = orders.filter(o => o.id !== id);
        saveData('inventory_orders', orders);
        renderOrders();
        updateDashboard();
    }
};

const renderOrders = () => {
    const tbody = document.querySelector('#orders-table tbody');
    const recentTbody = document.querySelector('#recent-orders-table tbody');
    tbody.innerHTML = '';
    recentTbody.innerHTML = '';

    // Sort orders by date (newest first)
    const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    sortedOrders.forEach((o, index) => {
        const profitPerPiece = o.sellingPrice - o.costPrice;
        let totalOrderProfit = 0;
        
        // Backward compatibility for old orders without these fields
        const actual = o.shippingActual !== undefined ? o.shippingActual : (o.shipping || 0);
        const collected = o.shippingCollected !== undefined ? o.shippingCollected : (o.shipping || 0);
        const discount = o.discount !== undefined ? o.discount : 0;

        if (o.status === 'delivered') {
            totalOrderProfit = (profitPerPiece * o.quantity) - (actual - collected) - discount;
        } else if (o.status === 'returned') {
            totalOrderProfit = -actual;
        } else if (o.status === 'returned_no_receive') {
            totalOrderProfit = -21;
        }

        const statusLabel = {
            'pending': 'قيد التنفيذ',
            'delivered': 'تم التسليم',
            'returned': 'مرتجع',
            'returned_no_receive': 'مرتجع دون استلام'
        }[o.status];

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${o.id.split('-')[1]}</td>
            <td>${o.orderDate || '-'}</td>
            <td>${o.customerName || '-'}</td>
            <td>${o.productName}</td>
            <td>${o.quantity}</td>
            <td style="font-size: 0.85rem">
                <div style="color: var(--danger)">فعلي: ${formatCurrency(actual)}</div>
                <div style="color: var(--success)">مُحصل: ${formatCurrency(collected)}</div>
            </td>
            <td>${formatCurrency(discount)}</td>
            <td style="color: ${totalOrderProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">
                ${formatCurrency(totalOrderProfit)}
            </td>
            <td><span class="badge badge-${o.status}">${statusLabel}</span></td>
            <td>
                <select class="form-input status-select" data-id="${o.id}" style="padding: 0.3rem; width: auto; font-size: 0.8rem;">
                    <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>قيد التنفيذ</option>
                    <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>تم التسليم</option>
                    <option value="returned" ${o.status === 'returned' ? 'selected' : ''}>مرتجع</option>
                    <option value="returned_no_receive" ${o.status === 'returned_no_receive' ? 'selected' : ''}>مرتجع دون استلام</option>
                </select>
                <button class="btn-icon btn-danger-icon delete-order-btn" data-id="${o.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);

        // Add to dashboard recent table (limit to 5)
        if (index < 5) {
            const recentTr = document.createElement('tr');
            recentTr.innerHTML = `
                <td>#${o.id.split('-')[1]}</td>
                <td>${o.productName}</td>
                <td>${o.quantity}</td>
                <td>${formatCurrency(o.sellingPrice * o.quantity)}</td>
                <td><span class="badge badge-${o.status}">${statusLabel}</span></td>
            `;
            recentTbody.appendChild(recentTr);
        }
    });
};

// --- Dashboard Logic ---

const updateDashboard = () => {
    let totalProfit = 0;
    let totalSales = 0;
    
    orders.forEach(o => {
        const profitPerPiece = o.sellingPrice - o.costPrice;
        const actual = o.shippingActual !== undefined ? o.shippingActual : (o.shipping || 0);
        const collected = o.shippingCollected !== undefined ? o.shippingCollected : (o.shipping || 0);
        const discount = o.discount !== undefined ? o.discount : 0;

        if (o.status === 'delivered') {
            totalProfit += (profitPerPiece * o.quantity) - (actual - collected) - discount;
            totalSales += (o.sellingPrice * o.quantity) + collected - discount;
        } else if (o.status === 'returned') {
            totalProfit -= actual;
        } else if (o.status === 'returned_no_receive') {
            totalProfit -= 21;
        }
    });

    document.getElementById('stat-total-profit').innerText = formatCurrency(totalProfit);
    document.getElementById('stat-total-sales').innerText = formatCurrency(totalSales);
    
    let totalInventoryValue = 0;
    products.forEach(p => {
        totalInventoryValue += (p.stock || 0) * p.cost;
    });
    
    const inventoryEl = document.getElementById('stat-total-inventory');
    if (inventoryEl) inventoryEl.innerText = formatCurrency(totalInventoryValue);

    document.getElementById('stat-total-products').innerText = products.length;
    document.getElementById('stat-total-orders').innerText = orders.length;
};

// --- Initialization ---

const init = () => {
    renderProducts();
    renderOrders();
    updateProductSelect();
    updateDashboard();
};

init();

// --- Event Listeners for Dynamic Elements ---
document.querySelector('#products-table tbody').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-product-btn');
    const deleteBtn = e.target.closest('.delete-product-btn');

    if (editBtn) {
        editProduct(editBtn.dataset.id);
    } else if (deleteBtn) {
        deleteProduct(deleteBtn.dataset.id);
    }
});

document.querySelector('#orders-table tbody').addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-order-btn');
    if (deleteBtn) {
        deleteOrder(deleteBtn.dataset.id);
    }
});

document.querySelector('#orders-table tbody').addEventListener('change', (e) => {
    if (e.target.classList.contains('status-select')) {
        changeOrderStatus(e.target.dataset.id, e.target.value);
    }
});

// --- Export / Import ---
const exportBtn = document.getElementById('export-btn');
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        const data = {
            inventory_products: products,
            inventory_orders: orders
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "inventory_backup_" + new Date().toISOString().split('T')[0] + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });
}

const importFile = document.getElementById('import-file');
if (importFile) {
    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                if (data.inventory_products && data.inventory_orders) {
                    products = data.inventory_products;
                    orders = data.inventory_orders;
                    saveData('inventory_products', products);
                    saveData('inventory_orders', orders);
                    
                    renderProducts();
                    renderOrders();
                    updateProductSelect();
                    updateDashboard();
                    alert('تم استيراد البيانات بنجاح!');
                } else {
                    alert('ملف النسخة الاحتياطية غير صالح.');
                }
            } catch (err) {
                alert('حدث خطأ أثناء قراءة الملف.');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    });
}
