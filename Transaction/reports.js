// Reports Management
const transactions = JSON.parse(localStorage.getItem("transactions")) || [];

const reportForm = document.getElementById("reportForm");
const recentReportsList = document.getElementById("recentReportsList");

const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "INR",
});

// Mobile menu toggle
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebar = document.getElementById("sidebar");

if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
        if (window.innerWidth <= 1024) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove("open");
            }
        }
    });
}

// Set default dates
const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
document.getElementById("startDate").valueAsDate = firstDay;
document.getElementById("endDate").valueAsDate = today;

// Generate report
reportForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(reportForm);
    const reportType = formData.get("reportType");
    const reportFormat = formData.get("reportFormat");
    const startDate = new Date(formData.get("startDate"));
    const endDate = new Date(formData.get("endDate"));

    generateReport(reportType, reportFormat, startDate, endDate);
});

function generateReport(type, format, startDate, endDate) {
    const filteredTransactions = transactions.filter(txn => {
        const txnDate = new Date(txn.date);
        return txnDate >= startDate && txnDate <= endDate;
    });

    if (filteredTransactions.length === 0) {
        alert("No transactions found in the selected date range!");
        return;
    }

    if (format === "csv") {
        exportToCSV(filteredTransactions, type, startDate, endDate);
    } else if (format === "pdf") {
        exportToPDF(filteredTransactions, type, startDate, endDate);
    } else if (format === "excel") {
        exportToExcel(filteredTransactions, type, startDate, endDate);
    }
}

function exportToCSV(txns, type, startDate, endDate) {
    let csvContent = "Date,Type,Category,Name,Amount,Payment Mode,Remarks\n";

    txns.forEach(txn => {
        const date = new Date(txn.date).toLocaleDateString();
        csvContent += `"${date}","${txn.type}","${txn.category || ''}","${txn.name}","${txn.amount}","${txn.paymentMode || ''}","${txn.remarks || ''}"\n`;
    });

    downloadFile(csvContent, `report-${type}-${formatDate(startDate)}-to-${formatDate(endDate)}.csv`, "text/csv");
}

function exportToExcel(txns, type, startDate, endDate) {
    // For Excel, we'll export as CSV with .xls extension (simple approach)
    let csvContent = "Date\tType\tCategory\tName\tAmount\tPayment Mode\tRemarks\n";

    txns.forEach(txn => {
        const date = new Date(txn.date).toLocaleDateString();
        csvContent += `${date}\t${txn.type}\t${txn.category || ''}\t${txn.name}\t${txn.amount}\t${txn.paymentMode || ''}\t${txn.remarks || ''}\n`;
    });

    downloadFile(csvContent, `report-${type}-${formatDate(startDate)}-to-${formatDate(endDate)}.xls`, "application/vnd.ms-excel");
}

function exportToPDF(txns, type, startDate, endDate) {
    // Create a printable HTML page
    const income = txns.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expense = txns.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    const categoryBreakdown = {};
    txns.forEach(txn => {
        if (txn.type === "expense") {
            categoryBreakdown[txn.category] = (categoryBreakdown[txn.category] || 0) + txn.amount;
        }
    });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Financial Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #6366f1; border-bottom: 3px solid #6366f1; padding-bottom: 10px; }
        h2 { color: #4f46e5; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #6366f1; color: white; }
        tr:nth-child(even) { background-color: #f8fafc; }
        .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
        .summary-card { padding: 20px; border-radius: 8px; text-align: center; }
        .income-card { background: #d1fae5; color: #065f46; }
        .expense-card { background: #fee2e2; color: #991b1b; }
        .balance-card { background: #dbeafe; color: #1e40af; }
        .summary-card h3 { margin: 0; font-size: 14px; }
        .summary-card p { margin: 10px 0 0 0; font-size: 24px; font-weight: bold; }
        @media print {
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>Financial Report</h1>
      <p><strong>Period:</strong> ${formatDate(startDate)} to ${formatDate(endDate)}</p>
      <p><strong>Report Type:</strong> ${type}</p>
      <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>

      <div class="summary">
        <div class="summary-card income-card">
          <h3>Total Income</h3>
          <p>${formatter.format(income)}</p>
        </div>
        <div class="summary-card expense-card">
          <h3>Total Expense</h3>
          <p>${formatter.format(expense)}</p>
        </div>
        <div class="summary-card balance-card">
          <h3>Net Balance</h3>
          <p>${formatter.format(balance)}</p>
        </div>
      </div>

      <h2>Category Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Amount</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(categoryBreakdown).map(([cat, amt]) => `
            <tr>
              <td>${cat}</td>
              <td>${formatter.format(amt)}</td>
              <td>${((amt / expense) * 100).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>Transaction Details</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Category</th>
            <th>Name</th>
            <th>Amount</th>
            <th>Payment Mode</th>
          </tr>
        </thead>
        <tbody>
          ${txns.map(txn => `
            <tr>
              <td>${new Date(txn.date).toLocaleDateString()}</td>
              <td>${txn.type}</td>
              <td>${txn.category || '-'}</td>
              <td>${txn.name}</td>
              <td style="color: ${txn.type === 'income' ? '#10b981' : '#ef4444'}">${formatter.format(txn.amount)}</td>
              <td>${txn.paymentMode || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <button onclick="window.print()" style="margin: 20px 0; padding: 10px 20px; background: #6366f1; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Print / Save as PDF</button>
    </body>
    </html>
  `);
    printWindow.document.close();
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    alert(`Report generated: ${filename}`);
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Quick report functions
function generateThisMonth() {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = now;
    generateReport("monthly", "csv", startDate, endDate);
}

function generateLastMonth() {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    generateReport("monthly", "csv", startDate, endDate);
}

function generateThisYear() {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), 0, 1);
    const endDate = now;
    generateReport("yearly", "csv", startDate, endDate);
}

function generateCustomRange() {
    document.getElementById("reportForm").scrollIntoView({ behavior: "smooth" });
}
