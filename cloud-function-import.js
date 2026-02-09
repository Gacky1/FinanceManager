const mysql = require("mysql2/promise");

// BULK IMPORT TRANSACTIONS FROM CSV
exports.importTransactions = async (req, res) => {
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

        const { transactions } = req.body;

        if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
            await connection.end();
            return res.status(400).json({
                error: "Invalid request: transactions array is required"
            });
        }

        // Validate all transactions before inserting
        const errors = [];
        transactions.forEach((txn, index) => {
            if (!txn.transaction_type || !txn.transaction_name || !txn.amount || !txn.transaction_date) {
                errors.push(`Row ${index + 1}: Missing required fields`);
            }
        });

        if (errors.length > 0) {
            await connection.end();
            return res.status(400).json({
                error: "Validation failed",
                details: errors
            });
        }

        // Begin transaction for atomic insert
        await connection.beginTransaction();

        try {
            // Prepare bulk insert query
            const sql = `INSERT INTO transactions 
                (transaction_type, category, transaction_name, amount, transaction_date, payment_mode, remarks) 
                VALUES ?`;

            // Format data for mysql2 bulk insert: [[val1, val2...], [val1, val2...]]
            const values = transactions.map(txn => [
                txn.transaction_type,
                txn.category || '',
                txn.transaction_name,
                parseFloat(txn.amount),
                txn.transaction_date,
                txn.payment_mode || '',
                txn.remarks || ''
            ]);

            const [result] = await connection.query(sql, [values]);

            // We need to return an array of IDs. Since it's a bulk insert, 
            // result.insertId is the FIRST ID, and they are usually sequential.
            const firstId = result.insertId;
            const ids = Array.from({ length: result.affectedRows }, (_, i) => firstId + i);

            // Commit transaction
            await connection.commit();
            await connection.end();

            res.status(200).json({
                message: `Successfully imported ${result.affectedRows} transactions`,
                count: result.affectedRows,
                ids: ids
            });
        } catch (insertError) {
            await connection.rollback();
            throw insertError;
        }
    } catch (err) {
        console.error("DB ERROR:", err);
        res.status(500).json({
            error: "Database error",
            message: err.message,
            stack: err.stack
        });
    }
};
