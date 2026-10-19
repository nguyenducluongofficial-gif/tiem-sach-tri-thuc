const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Phục vụ toàn bộ các file tĩnh (HTML, CSS, JS, thư mục IMG) trực tiếp từ server
app.use(express.static(__dirname));

// Cấu hình kết nối PostgreSQL chuẩn theo thông số của bạn
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'book_store_db',
    password: 'hanoi2006',
    port: 5555,
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Lỗi kết nối PostgreSQL:', err.stack);
    }
    console.log('✅ Đã kết nối thành công tới PostgreSQL Database!');
    release();
});

// 1. API Lấy danh sách sản phẩm
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
        const mappedProducts = result.rows.map(p => ({
            id: p.id,
            title: p.title,
            category: p.category,
            price: p.price,
            oldPrice: p.old_price,
            rating: p.rating,
            image: p.image,
            desc: p.description
        }));
        res.json(mappedProducts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. API Thêm sản phẩm mới
app.post('/api/products', async (req, res) => {
    const { title, category, price, oldPrice, rating, image, desc } = req.body;
    try {
        const queryText = `
            INSERT INTO products (title, category, price, old_price, rating, image, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `;
        const values = [title, category, price, oldPrice, rating || 5, image, desc];
        const result = await pool.query(queryText, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. API Sửa sản phẩm
app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { title, category, price, oldPrice, rating, image, desc } = req.body;
    try {
        const queryText = `
            UPDATE products 
            SET title=$1, category=$2, price=$3, old_price=$4, rating=$5, image=$6, description=$7
            WHERE id=$8 RETURNING *
        `;
        const values = [title, category, price, oldPrice, rating, image, desc, id];
        const result = await pool.query(queryText, values);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. API Xóa sản phẩm
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ message: 'Xóa thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. API Tạo đơn hàng
app.post('/api/orders', async (req, res) => {
    const { orderId, customer, total } = req.body;
    try {
        const queryText = `
            INSERT INTO orders (order_code, customer_name, customer_phone, customer_address, total_price)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `;
        const values = [orderId, customer.name, customer.phone, customer.address, total];
        const result = await pool.query(queryText, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. API Lấy danh sách đơn hàng
app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Website đang chạy tại: http://localhost:${PORT}`);
});