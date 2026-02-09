const transactions = JSON.parse(localStorage.getItem("transactions")) || [];

// Category definitions based on transaction type
const categories = {
  income: [
    { value: "salary", label: "Salary" },
    { value: "freelance", label: "Freelance" },
    { value: "investment", label: "Investment Returns" },
    { value: "gifts", label: "Gifts" },
    { value: "refunds", label: "Refunds" },
    { value: "other-income", label: "Other Income" }
  ],
  expense: [
    { value: "food", label: "Food & Dining" },
    { value: "transport", label: "Transportation" },
    { value: "rent", label: "Rent" },
    { value: "health", label: "Health & Medical" },
    { value: "shopping", label: "Shopping" },
    { value: "entertainment", label: "Entertainment" },
    { value: "bills", label: "Bills & Utilities" },
    { value: "education", label: "Education" },
    { value: "travel", label: "Travel" },
    { value: "other-expense", label: "Other Expense" }
  ]
};

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "INR",
  signDisplay: "always",
});

const list = document.getElementById("transactionList");
const form = document.getElementById("transactionForm");
const status = document.getElementById("status");
const balance = document.getElementById("balance");
const income = document.getElementById("income");
const expense = document.getElementById("expense");
const typeSelect = document.getElementById("type");
const categorySelect = document.getElementById("category");

// Mobile menu toggle
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebar = document.getElementById("sidebar");

if (mobileMenuBtn && sidebar) {
  mobileMenuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 1024) {
      if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        sidebar.classList.remove("open");
      }
    }
  });
}

// CSV Import functionality
const csvFileInput = document.getElementById("csvFileInput");
const fileNameDisplay = document.getElementById("fileName");
const importStatus = document.getElementById("importStatus");

if (csvFileInput) {
  csvFileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    // Display file name
    fileNameDisplay.textContent = file.name;
    importStatus.innerHTML = '<div class="status-loading"><i class="fa-solid fa-spinner fa-spin"></i> Processing CSV file...</div>';

    try {
      const importer = new CSVImporter();
      const result = await importer.importFromCSV(file);

      // Update the transactions array
      transactions.length = 0;
      transactions.push(...result.transactions);

      // Update UI
      updateTotal();
      renderList();

      // Show success message
      let message = `✅ Successfully imported ${result.count} transactions!`;
      if (result.warnings && result.warnings.length > 0) {
        message += `\n\nWarnings:\n${result.warnings.slice(0, 5).join('\n')}`;
        if (result.warnings.length > 5) {
          message += `\n... and ${result.warnings.length - 5} more warnings`;
        }
      }

      importStatus.innerHTML = `<div class="status-success"><i class="fa-solid fa-check-circle"></i> ${message.replace(/\n/g, '<br>')}</div>`;

      // Clear file input
      csvFileInput.value = '';
      setTimeout(() => {
        fileNameDisplay.textContent = '';
        importStatus.innerHTML = '';
      }, 10000);

    } catch (error) {
      console.error("Import Error:", error);
      importStatus.innerHTML = `<div class="status-error"><i class="fa-solid fa-exclamation-circle"></i> Error: ${error.message}</div>`;

      // Clear file input
      csvFileInput.value = '';
      fileNameDisplay.textContent = '';
    }
  });
}

// Initialize form
form.addEventListener("submit", addTransaction);
typeSelect.addEventListener("change", updateCategoryOptions);

// Set default date to today
document.getElementById("date").valueAsDate = new Date();

// Initialize category options
updateCategoryOptions();

function updateCategoryOptions() {
  const selectedType = typeSelect.value;
  const categoryOptions = categories[selectedType] || [];

  // Clear existing options except the first placeholder
  categorySelect.innerHTML = '<option value="">Select Category</option>';

  // Add category options based on selected type
  categoryOptions.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat.value;
    option.textContent = cat.label;
    categorySelect.appendChild(option);
  });
}

function updateTotal() {
  const incomeTotal = transactions
    .filter((trx) => trx.type === "income")
    .reduce((total, trx) => total + trx.amount, 0);

  const expenseTotal = transactions
    .filter((trx) => trx.type === "expense")
    .reduce((total, trx) => total + trx.amount, 0);

  const balanceTotal = incomeTotal - expenseTotal;

  balance.textContent = formatter.format(balanceTotal).substring(1);
  income.textContent = formatter.format(incomeTotal);
  expense.textContent = formatter.format(expenseTotal * -1);
}

function getCategoryLabel(type, value) {
  const categoryList = categories[type] || [];
  const category = categoryList.find(cat => cat.value === value);
  return category ? category.label : value;
}

function formatPaymentMode(mode) {
  const modes = {
    "cash": "Cash",
    "credit-card": "Credit Card",
    "debit-card": "Debit Card",
    "upi": "UPI",
    "net-banking": "Net Banking",
    "wallet": "Wallet",
    "other": "Other"
  };
  return modes[mode] || mode;
}

function renderList() {
  list.innerHTML = "";

  status.textContent = "";
  if (transactions.length === 0) {
    status.textContent = "No transactions.";
    return;
  }

  transactions.forEach(({ id, dbId, name, amount, date, type, category, paymentMode, remarks }) => {
    const sign = "income" === type ? 1 : -1;
    const categoryLabel = getCategoryLabel(type, category || "");
    const paymentModeLabel = formatPaymentMode(paymentMode || "");

    const li = document.createElement("li");

    li.innerHTML = `
      <div class="transaction-content">
        <div class="name">
          <h4>${name}</h4>
          <p class="transaction-meta">
            <span class="date">${new Date(date).toLocaleDateString()}</span>
            ${category ? `<span class="category-badge ${type}">${categoryLabel}</span>` : ''}
            ${paymentMode ? `<span class="payment-mode">via ${paymentModeLabel}</span>` : ''}
          </p>
          ${remarks ? `<p class="remarks">${remarks}</p>` : ''}
        </div>

        <div class="amount ${type}">
          <span>${formatter.format(amount * sign)}</span>
        </div>
      </div>
    
      <div class="action">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" onclick="deleteTransaction(${id}, ${dbId || 'null'})">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    `;

    list.appendChild(li);
  });
}

renderList();
updateTotal();

async function deleteTransaction(id, dbId) {
  // Confirm deletion
  if (!confirm("Are you sure you want to delete this transaction?")) {
    return;
  }

  try {
    // If we have a database ID, delete from database first
    if (dbId) {
      const response = await fetch(
        `https://deletetransaction-505432234681.europe-west1.run.app/?id=${dbId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Delete API Error:", error);
        alert("❌ Error deleting from database: " + error);
        return;
      }

      console.log("Transaction deleted from database");
    }

    // Remove from local array
    const index = transactions.findIndex((trx) => trx.id === id);
    if (index !== -1) {
      transactions.splice(index, 1);
    }

    updateTotal();
    saveTransactions();
    renderList();

    console.log("Transaction deleted successfully");
  } catch (error) {
    console.error("Delete Error:", error);
    alert("❌ Error deleting transaction: " + error.message);
  }
}

async function addTransaction(e) {
  e.preventDefault();

  const formData = new FormData(this);

  // Prepare data for Cloud SQL API
  const apiData = {
    transaction_type: formData.get("type"),
    category: formData.get("category"),
    transaction_name: formData.get("name"),
    amount: parseFloat(formData.get("amount")),
    transaction_date: formData.get("date"),
    payment_mode: formData.get("paymentMode"),
    remarks: formData.get("remarks") || ""
  };

  try {
    // Send to Cloud SQL
    const response = await fetch(
      "https://inserttransaction-505432234681.asia-south1.run.app/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(apiData)
      }
    );

    if (response.ok) {
      // Parse response to get database ID
      const result = await response.json();
      const dbId = result.id;

      console.log("Transaction saved with DB ID:", dbId);

      // Prepare data for local storage and UI
      const transactionData = {
        id: Date.now(), // Local ID for UI tracking
        dbId: dbId, // Database ID for deletion
        name: formData.get("name"),
        amount: parseFloat(formData.get("amount")),
        date: new Date(formData.get("date")),
        type: formData.get("type"),
        category: formData.get("category"),
        paymentMode: formData.get("paymentMode"),
        remarks: formData.get("remarks") || "",
      };

      // Success - add to local array and update UI
      transactions.push(transactionData);

      this.reset();

      // Reset date to today after form reset
      document.getElementById("date").valueAsDate = new Date();

      // Reset category options to match default type (expense)
      updateCategoryOptions();

      updateTotal();
      saveTransactions(); // Also save to localStorage as backup
      renderList();

      // Show success message
      alert("✅ Transaction saved to database successfully!");
    } else {
      const error = await response.text();
      alert("❌ Error saving to database: " + error);
      console.error("API Error:", error);
    }
  } catch (error) {
    console.error("Network Error:", error);
    alert("❌ Server error. Please check your connection and try again.");
  }
}

function saveTransactions() {
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  localStorage.setItem("transactions", JSON.stringify(transactions));
}