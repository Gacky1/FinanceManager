const mysql = require("mysql2/promise");

// INSERT TRANSACTION
exports.insertTransaction = async (req, res) => {
    // ✅ CORS HEADERS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const connection = await mysql.createConnection({
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
        });

        const {
            transaction_type,
            category,
            transaction_name,
            amount,
            transaction_date,
            payment_mode,
            remarks
        } = req.body;

        const [result] = await connection.execute(
            `INSERT INTO transactions
       (transaction_type, category, transaction_name, amount, transaction_date, payment_mode, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                transaction_type,
                category,
                transaction_name,
                amount,
                transaction_date,
                payment_mode,
                remarks
            ]
        );

        await connection.end();

        // Return the inserted ID so frontend can track it
        res.status(200).json({
            message: "Transaction inserted successfully",
            id: result.insertId
        });

    } catch (err) {
        console.error("DB ERROR:", err);
        res.status(500).send("DB Error: " + err.message);
    }
};

// DELETE TRANSACTION
exports.deleteTransaction = async (req, res) => {
    // ✅ CORS HEADERS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const connection = await mysql.createConnection({
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
        });

        // Get transaction ID from query parameter or body
        const transactionId = req.query.id || req.body.id;

        if (!transactionId) {
            await connection.end();
            return res.status(400).send("Transaction ID is required");
        }

        await connection.execute(
            `DELETE FROM transactions WHERE id = ?`,
            [transactionId]
        );

        await connection.end();
        res.status(200).send("Transaction deleted successfully");

    } catch (err) {
        console.error("DB ERROR:", err);
        res.status(500).send("DB Error: " + err.message);
    }
};
