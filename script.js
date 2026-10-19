const API_URL = 'http://localhost:3000/api';

let products = [];
let cart = [];
let orders = [];
let activeCategory = 'ALL';
let activeModalProductId = null;

// --- 1. LẤY SẢN PHẨM TỪ POSTGRESQL API ---
async function fetchProductsFromDB() {
    try {
        const res = await fetch(`${API_URL}/products`);
        products = await res.json();
        renderProducts();
    } catch (err) {
        console.error('Lỗi khi tải dữ liệu từ CSDL PostgreSQL:', err);
    }
}

// --- 2. CHUYỂN ĐỔI CHẾ ĐỘ (KHÁCH HÀNG / ADMIN) ---
function switchMode(mode) {
    const storeView = document.getElementById('store-view');
    const adminView = document.getElementById('admin-view');
    const btnStore = document.getElementById('btn-mode-store');
    const btnAdmin = document.getElementById('btn-mode-admin');

    if (mode === 'admin') {
        storeView.classList.add('hidden');
        adminView.classList.remove('hidden');
        btnAdmin.classList.add('active');
        btnStore.classList.remove('active');
        renderAdminProducts();
        fetchOrdersFromDB();
    } else {
        adminView.classList.add('hidden');
        storeView.classList.remove('hidden');
        btnStore.classList.add('active');
        btnAdmin.classList.remove('active');
        fetchProductsFromDB();
    }
}

function showPage(pageName) {
    document.getElementById('page-home').classList.toggle('hidden', pageName !== 'home');
    document.getElementById('page-contact').classList.toggle('hidden', pageName !== 'contact');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- 3. ĐỒNG HỒ ĐẾM NGƯỢC FLASH SALE ---
let totalSeconds = 2 * 3600 + 45 * 60; // 2 giờ 45 phút
function startCountdown() {
    setInterval(() => {
        if (totalSeconds > 0) {
            totalSeconds--;
            const hrs = Math.floor(totalSeconds / 3600);
            const mins = Math.floor((totalSeconds % 3600) / 60);
            const secs = totalSeconds % 60;
            
            const hoursEl = document.getElementById('hours');
            const minutesEl = document.getElementById('minutes');
            const secondsEl = document.getElementById('seconds');

            if (hoursEl && minutesEl && secondsEl) {
                hoursEl.innerText = String(hrs).padStart(2, '0');
                minutesEl.innerText = String(mins).padStart(2, '0');
                secondsEl.innerText = String(secs).padStart(2, '0');
            }
        }
    }, 1000);
}

// --- 4. RENDER DỮ LIỆU SẢN PHẨM KHÁCH HÀNG ---
function renderProducts(itemsToRender = null) {
    const grid = document.getElementById('products-grid');
    const list = itemsToRender || (activeCategory === 'ALL' ? products : products.filter(p => p.category === activeCategory));
    
    document.getElementById('product-count').innerText = `Hiển thị ${list.length} sản phẩm`;
    grid.innerHTML = '';

    if (list.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #888;">Không tìm thấy sản phẩm nào trong CSDL.</div>`;
        return;
    }

    list.forEach(p => {
        const card = document.createElement('div');
        card.className = "card";
        card.onclick = () => openDetailModal(p.id);
        card.innerHTML = `
            <div>
                <img src="${p.image}" alt="${p.title}" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400'">
                <h3>${p.title}</h3>
                <div class="stars">⭐⭐⭐⭐⭐</div>
            </div>
            <div>
                <div class="price">${p.price.toLocaleString('vi-VN')}đ ${p.oldPrice ? `<del>${p.oldPrice.toLocaleString('vi-VN')}đ</del>` : ''}</div>
                <button onclick="event.stopPropagation(); addToCart(${p.id}, 1)" class="btn-card-add">
                    <i class="fa-solid fa-cart-plus"></i> Thêm Giỏ Hàng
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterCategory(cat) {
    activeCategory = cat;
    showPage('home');
    renderProducts();
}

// --- 5. CÁC THAO TÁC ADMIN (CRUD TRÊN POSTGRESQL) ---
function renderAdminProducts() {
    const tbody = document.getElementById('admin-products-table');
    tbody.innerHTML = '';

    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${p.image}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400'"></td>
            <td><strong>${p.title}</strong></td>
            <td>${p.category}</td>
            <td>${p.oldPrice ? p.oldPrice.toLocaleString('vi-VN') + 'đ' : '-'}</td>
            <td style="color:#f1c40f; font-weight:bold;">${p.price.toLocaleString('vi-VN')}đ</td>
            <td style="text-align:center;">
                <button onclick="openProductModal(${p.id})" class="btn-action-edit"><i class="fa-solid fa-pen"></i> Sửa</button>
                <button onclick="deleteProduct(${p.id})" class="btn-action-del"><i class="fa-solid fa-trash"></i> Xóa</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function handleSaveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const payload = {
        title: document.getElementById('prod-title').value,
        category: document.getElementById('prod-category').value,
        rating: parseInt(document.getElementById('prod-rating').value) || 5,
        oldPrice: parseInt(document.getElementById('prod-oldprice').value) || 0,
        price: parseInt(document.getElementById('prod-price').value) || 0,
        image: document.getElementById('prod-image').value,
        desc: document.getElementById('prod-desc').value
    };

    try {
        if (id) {
            await fetch(`${API_URL}/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            showToast('Đã cập nhật sản phẩm trong PostgreSQL!');
        } else {
            await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            showToast('Đã thêm sản phẩm mới vào PostgreSQL!');
        }
        await fetchProductsFromDB();
        renderAdminProducts();
        closeProductModal();
    } catch (err) {
        alert('Có lỗi xảy ra khi lưu vào CSDL.');
    }
}

async function deleteProduct(id) {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi CSDL PostgreSQL?')) {
        try {
            await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
            await fetchProductsFromDB();
            renderAdminProducts();
            showToast('Đã xóa sản phẩm khỏi CSDL.');
        } catch (err) {
            alert('Lỗi khi xóa sản phẩm.');
        }
    }
}

async function fetchOrdersFromDB() {
    try {
        const res = await fetch(`${API_URL}/orders`);
        orders = await res.json();
        renderAdminOrders();
    } catch (err) {
        console.error(err);
    }
}

function renderAdminOrders() {
    const container = document.getElementById('admin-orders-list');
    document.getElementById('admin-orders-count').innerText = orders.length;
    container.innerHTML = '';

    if (orders.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#888; padding:20px;">Chưa có đơn hàng nào trong CSDL.</div>`;
        return;
    }

    orders.forEach(ord => {
        const div = document.createElement('div');
        div.style.cssText = "background:#374151; padding:15px; border-radius:8px; margin-bottom:10px;";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; color:#f1c40f;">
                <strong>Mã đơn: ${ord.order_code}</strong>
                <small>${new Date(ord.created_at).toLocaleString('vi-VN')}</small>
            </div>
            <div style="font-size:13px; color:#ccc;">
                <p>Khách hàng: ${ord.customer_name} - SĐT: ${ord.customer_phone}</p>
                <p>Địa chỉ: ${ord.customer_address}</p>
            </div>
            <div style="margin-top:8px; font-weight:bold; color:#e74c3c;">Tổng tiền: ${ord.total_price.toLocaleString('vi-VN')}đ</div>
        `;
        container.appendChild(div);
    });
}

// --- 6. GIỎ HÀNG & THAO TÁC MODAL ---
function addToCart(prodId, qty = 1) {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    const existing = cart.find(item => item.id === prodId);
    if (existing) { existing.qty += qty; } 
    else { cart.push({ id: prod.id, title: prod.title, price: prod.price, qty: qty }); }
    updateCartBadge();
    showToast(`Đã thêm "${prod.title}" vào giỏ hàng!`);
}

function updateCartBadge() {
    document.getElementById('cart-badge').innerText = cart.reduce((sum, i) => sum + i.qty, 0);
}

function openCartModal() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';
    let total = 0;
    cart.forEach((item) => {
        total += item.price * item.qty;
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:5px;">
                <span>${item.title} (x${item.qty})</span>
                <strong>${(item.price * item.qty).toLocaleString('vi-VN')}đ</strong>
            </div>`;
    });
    document.getElementById('cart-total-price').innerText = total.toLocaleString('vi-VN') + 'đ';
    document.getElementById('cartModal').classList.remove('hidden');
}

function closeCartModal() { document.getElementById('cartModal').classList.add('hidden'); }

async function handleCheckout(e) {
    e.preventDefault();
    if (cart.length === 0) return alert('Giỏ hàng trống!');

    const orderPayload = {
        orderId: 'DH' + Date.now().toString().slice(-6),
        customer: {
            name: document.getElementById('cust-name').value,
            phone: document.getElementById('cust-phone').value,
            address: document.getElementById('cust-address').value
        },
        total: cart.reduce((sum, item) => sum + item.price * item.qty, 0)
    };

    try {
        await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });
        cart = [];
        updateCartBadge();
        closeCartModal();
        showToast('Đặt hàng thành công! Đã lưu đơn hàng vào CSDL PostgreSQL.');
    } catch (err) {
        alert('Lỗi đặt hàng!');
    }
}

function openProductModal(prodId = null) {
    const modal = document.getElementById('adminProductModal');
    if (prodId) {
        const p = products.find(item => item.id === prodId);
        document.getElementById('admin-modal-title').innerText = 'Cập Nhật Sản Phẩm';
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-title').value = p.title;
        document.getElementById('prod-category').value = p.category;
        document.getElementById('prod-oldprice').value = p.oldPrice || p.price;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-image').value = p.image;
        document.getElementById('prod-desc').value = p.desc || '';
    } else {
        document.getElementById('admin-modal-title').innerText = 'Thêm Sản Phẩm Mới';
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-title').value = '';
        document.getElementById('prod-category').value = 'TRUYEN';
        document.getElementById('prod-oldprice').value = '';
        document.getElementById('prod-price').value = '';
        document.getElementById('prod-image').value = '';
        document.getElementById('prod-desc').value = '';
    }
    modal.classList.remove('hidden');
}

function closeProductModal() { document.getElementById('adminProductModal').classList.add('hidden'); }

function togglePopup(show) {
    const popup = document.getElementById('adPopup');
    if (popup) {
        popup.classList.toggle('hidden', !show);
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Khởi chạy khi tải trang
window.onload = function() {
    fetchProductsFromDB();
    startCountdown();
    setTimeout(() => togglePopup(true), 4000);
};