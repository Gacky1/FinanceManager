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

  transactions.forEach(({ id, name, amount, date, type, category, paymentMode, remarks }) => {
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
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" onclick="deleteTransaction(${id})">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    `;

    list.appendChild(li);
  });
}

renderList();
updateTotal();

function deleteTransaction(id) {
  const index = transactions.findIndex((trx) => trx.id === id);
  transactions.splice(index, 1);

  updateTotal();
  saveTransactions();
  renderList();
}

function addTransaction(e) {
  e.preventDefault();

  const formData = new FormData(this);

  transactions.push({
    id: Date.now(), // Use timestamp for better unique IDs
    name: formData.get("name"),
    amount: parseFloat(formData.get("amount")),
    date: new Date(formData.get("date")),
    type: formData.get("type"),
    category: formData.get("category"),
    paymentMode: formData.get("paymentMode"),
    remarks: formData.get("remarks") || "",
  });

  this.reset();

  // Reset date to today after form reset
  document.getElementById("date").valueAsDate = new Date();

  // Reset category options to match default type (expense)
  updateCategoryOptions();

  updateTotal();
  saveTransactions();
  renderList();
}

function saveTransactions() {
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  localStorage.setItem("transactions", JSON.stringify(transactions));
}