// Budget Management
const budgets = JSON.parse(localStorage.getItem("budgets")) || [];
const transactions = JSON.parse(localStorage.getItem("transactions")) || [];

const budgetForm = document.getElementById("budgetForm");
const budgetsList = document.getElementById("budgetsList");
const monthlyBudgetEl = document.getElementById("monthlyBudget");
const spentThisMonthEl = document.getElementById("spentThisMonth");
const remainingEl = document.getElementById("remaining");

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
renderBudgets();
updateSummary();

// Add budget
budgetForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(budgetForm);
    const budget = {
        id: Date.now(),
        category: formData.get("budgetCategory"),
        amount: parseFloat(formData.get("budgetAmount")),
        period: formData.get("budgetPeriod"),
        alertAt: parseInt(formData.get("budgetAlert")),
        createdAt: new Date().toISOString()
    };

    budgets.push(budget);
    saveBudgets();
    renderBudgets();
    updateSummary();
    budgetForm.reset();
    document.getElementById("budgetAlert").value = "80";
});

function saveBudgets() {
    localStorage.setItem("budgets", JSON.stringify(budgets));
}

function getCategoryLabel(value) {
    const categories = {
        "food": "Food & Dining",
        "transport": "Transportation",
        "rent": "Rent",
        "health": "Health & Medical",
        "shopping": "Shopping",
        "entertainment": "Entertainment",
        "bills": "Bills & Utilities",
        "education": "Education",
        "travel": "Travel",
        "other": "Other"
    };
    return categories[value] || value;
}

function getSpentAmount(category, period) {
    const now = new Date();
    let startDate;

    if (period === "monthly") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "weekly") {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    } else if (period === "yearly") {
        startDate = new Date(now.getFullYear(), 0, 1);
    }

    return transactions
        .filter(txn => {
            const txnDate = new Date(txn.date);
            return txn.type === "expense" &&
                txn.category === category &&
                txnDate >= startDate &&
                txnDate <= now;
        })
        .reduce((sum, txn) => sum + txn.amount, 0);
}

function updateSummary() {
    const monthlyBudgets = budgets.filter(b => b.period === "monthly");
    const totalBudget = monthlyBudgets.reduce((sum, b) => sum + b.amount, 0);

    const totalSpent = monthlyBudgets.reduce((sum, b) => {
        return sum + getSpentAmount(b.category, b.period);
    }, 0);

    const remaining = totalBudget - totalSpent;

    monthlyBudgetEl.textContent = formatter.format(totalBudget).substring(1);
    spentThisMonthEl.textContent = formatter.format(totalSpent).substring(1);
    remainingEl.textContent = formatter.format(remaining).substring(1);
}

function renderBudgets() {
    if (budgets.length === 0) {
        budgetsList.innerHTML = `
      <div class="status-message">
        <i class="fa-solid fa-info-circle"></i> No budgets created yet. Set your first budget above to track your spending!
      </div>
    `;
        return;
    }

    budgetsList.innerHTML = budgets.map(budget => {
        const spent = getSpentAmount(budget.category, budget.period);
        const percentage = (spent / budget.amount) * 100;
        const isOverBudget = percentage > 100;
        const isNearLimit = percentage >= budget.alertAt && percentage <= 100;

        return `
      <li>
        <div class="budget-item">
          <div class="budget-header">
            <div class="budget-info">
              <h4>${getCategoryLabel(budget.category)}</h4>
              <p class="transaction-meta">
                <span class="category-badge ${isOverBudget ? 'expense' : 'income'}">${budget.period}</span>
                ${isNearLimit ? '<span class="payment-mode" style="color: #f59e0b;">⚠️ Near Limit</span>' : ''}
                ${isOverBudget ? '<span class="payment-mode" style="color: #ef4444;">❌ Over Budget</span>' : ''}
              </p>
            </div>
            <div class="budget-amounts">
              <div class="amount ${isOverBudget ? 'expense' : 'income'}">
                <span>${formatter.format(spent)} / ${formatter.format(budget.amount)}</span>
              </div>
            </div>
          </div>
          <div class="budget-progress">
            <div class="progress-bar">
              <div class="progress-fill ${isOverBudget ? 'over-budget' : isNearLimit ? 'near-limit' : ''}" 
                   style="width: ${Math.min(percentage, 100)}%"></div>
            </div>
            <span class="progress-text">${percentage.toFixed(1)}%</span>
          </div>
        </div>
        <div class="action">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" onclick="deleteBudget(${budget.id})">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </li>
    `;
    }).join('');
}

function deleteBudget(id) {
    if (!confirm("Are you sure you want to delete this budget?")) {
        return;
    }

    const index = budgets.findIndex(b => b.id === id);
    if (index !== -1) {
        budgets.splice(index, 1);
        saveBudgets();
        renderBudgets();
        updateSummary();
    }
}
