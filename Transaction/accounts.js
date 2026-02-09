// Accounts Management
const accounts = JSON.parse(localStorage.getItem("accounts")) || [];

const accountForm = document.getElementById("accountForm");
const accountsList = document.getElementById("accountsList");
const totalBalanceEl = document.getElementById("totalBalance");
const activeAccountsEl = document.getElementById("activeAccounts");
const savingsBalanceEl = document.getElementById("savingsBalance");

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

// Initialize
renderAccounts();
updateSummary();

// Add account
accountForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(accountForm);
    const account = {
        id: Date.now(),
        name: formData.get("accountName"),
        type: formData.get("accountType"),
        balance: parseFloat(formData.get("balance")),
        bank: formData.get("bankName") || "",
        createdAt: new Date().toISOString()
    };

    accounts.push(account);
    saveAccounts();
    renderAccounts();
    updateSummary();
    accountForm.reset();
});

function saveAccounts() {
    localStorage.setItem("accounts", JSON.stringify(accounts));
}

function updateSummary() {
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const savingsAccounts = accounts.filter(acc => acc.type === "savings");
    const savingsBalance = savingsAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    totalBalanceEl.textContent = formatter.format(totalBalance).substring(1);
    activeAccountsEl.textContent = accounts.length;
    savingsBalanceEl.textContent = formatter.format(savingsBalance).substring(1);
}

function getAccountTypeLabel(type) {
    const types = {
        "savings": "Savings Account",
        "current": "Current Account",
        "credit": "Credit Card",
        "wallet": "Digital Wallet",
        "cash": "Cash"
    };
    return types[type] || type;
}

function getAccountIcon(type) {
    const icons = {
        "savings": "fa-piggy-bank",
        "current": "fa-building-columns",
        "credit": "fa-credit-card",
        "wallet": "fa-wallet",
        "cash": "fa-money-bill"
    };
    return icons[type] || "fa-wallet";
}

function renderAccounts() {
    if (accounts.length === 0) {
        accountsList.innerHTML = `
      <div class="status-message">
        <i class="fa-solid fa-info-circle"></i> No accounts added yet. Add your first account above to get started!
      </div>
    `;
        return;
    }

    accountsList.innerHTML = accounts.map(account => `
    <li>
      <div class="transaction-content">
        <div class="name">
          <h4>
            <i class="fa-solid ${getAccountIcon(account.type)}"></i>
            ${account.name}
          </h4>
          <p class="transaction-meta">
            <span class="category-badge income">${getAccountTypeLabel(account.type)}</span>
            ${account.bank ? `<span class="payment-mode">${account.bank}</span>` : ''}
          </p>
        </div>
        <div class="amount income">
          <span>${formatter.format(account.balance)}</span>
        </div>
      </div>
      <div class="action">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" onclick="deleteAccount(${account.id})">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </li>
  `).join('');
}

function deleteAccount(id) {
    if (!confirm("Are you sure you want to delete this account?")) {
        return;
    }

    const index = accounts.findIndex(acc => acc.id === id);
    if (index !== -1) {
        accounts.splice(index, 1);
        saveAccounts();
        renderAccounts();
        updateSummary();
    }
}
