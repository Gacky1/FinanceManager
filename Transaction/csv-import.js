// CSV Import Handler
class CSVImporter {
    constructor() {
        this.apiEndpoint = 'https://importtransactions-505432234681.asia-south1.run.app/';
    }

    // Parse CSV content
    parseCSV(csvContent) {
        const lines = csvContent.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV file is empty or has no data rows');
        }

        // Parse header
        const header = this.parseCSVLine(lines[0]);

        // Validate required columns
        const requiredColumns = ['transaction_type', 'transaction_name', 'amount', 'transaction_date'];
        const missingColumns = requiredColumns.filter(col => !header.includes(col));

        if (missingColumns.length > 0) {
            throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
        }

        // Parse data rows
        const transactions = [];
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty lines

            try {
                const values = this.parseCSVLine(lines[i]);
                const transaction = {};

                header.forEach((col, index) => {
                    transaction[col] = values[index] || '';
                });

                // Validate transaction
                this.validateTransaction(transaction, i + 1);
                transactions.push(transaction);
            } catch (error) {
                errors.push(`Row ${i + 1}: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            console.warn('CSV parsing warnings:', errors);
        }

        return { transactions, errors };
    }

    // Parse a single CSV line (handles quoted fields)
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    // Validate transaction data
    validateTransaction(transaction, rowNumber) {
        if (!transaction.transaction_type) {
            throw new Error('transaction_type is required');
        }

        if (!['income', 'expense'].includes(transaction.transaction_type)) {
            throw new Error(`Invalid transaction_type: ${transaction.transaction_type}. Must be 'income' or 'expense'`);
        }

        if (!transaction.transaction_name) {
            throw new Error('transaction_name is required');
        }

        if (!transaction.amount || isNaN(parseFloat(transaction.amount))) {
            throw new Error('Valid amount is required');
        }

        if (!transaction.transaction_date) {
            throw new Error('transaction_date is required');
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(transaction.transaction_date)) {
            throw new Error(`Invalid date format: ${transaction.transaction_date}. Expected YYYY-MM-DD`);
        }
    }

    // Upload transactions to database
    async uploadToDatabase(transactions) {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ transactions })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to upload transactions');
        }

        return await response.json();
    }

    // Add transactions to localStorage
    addToLocalStorage(transactions, insertedIds) {
        const existingTransactions = JSON.parse(localStorage.getItem('transactions')) || [];

        transactions.forEach((txn, index) => {
            const localTransaction = {
                id: Date.now() + index, // Unique local ID
                dbId: insertedIds[index], // Database ID
                name: txn.transaction_name,
                amount: parseFloat(txn.amount),
                date: new Date(txn.transaction_date),
                type: txn.transaction_type,
                category: txn.category || '',
                paymentMode: txn.payment_mode || '',
                remarks: txn.remarks || ''
            };

            existingTransactions.push(localTransaction);
        });

        // Sort by date (newest first)
        existingTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        localStorage.setItem('transactions', JSON.stringify(existingTransactions));
        return existingTransactions;
    }

    // Main import function
    async importFromCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const csvContent = event.target.result;

                    // Parse CSV
                    const { transactions, errors } = this.parseCSV(csvContent);

                    if (transactions.length === 0) {
                        throw new Error('No valid transactions found in CSV file');
                    }

                    // Upload to database
                    const result = await this.uploadToDatabase(transactions);

                    // Add to localStorage
                    const allTransactions = this.addToLocalStorage(transactions, result.ids);

                    resolve({
                        success: true,
                        count: result.count,
                        transactions: allTransactions,
                        warnings: errors
                    });

                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }
}

// Export for use in main script
window.CSVImporter = CSVImporter;
