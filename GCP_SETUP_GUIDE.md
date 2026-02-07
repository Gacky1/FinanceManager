# Google Cloud Platform Setup Guide for FinanceManager

This guide provides step-by-step instructions for integrating your FinanceManager application with Google Cloud Platform's Cloud SQL database.

## Prerequisites

- Google Cloud Platform account (free tier available)
- Node.js installed (v14 or higher)
- Basic knowledge of SQL and REST APIs
- Credit card for GCP account verification (free tier won't be charged)

## Phase 1: GCP Account & Project Setup

### 1. Create GCP Account
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Accept terms of service
4. Set up billing (required even for free tier)
   - New users get $300 in free credits for 90 days
   - Free tier includes Cloud SQL usage limits

### 2. Create a New Project
1. In GCP Console, click the project dropdown at the top
2. Click "New Project"
3. Enter project name: `finance-manager`
4. Note your Project ID (you'll need this later)
5. Click "Create"

## Phase 2: Cloud SQL Setup

### 1. Enable Cloud SQL API
```bash
# Using gcloud CLI (or use Console UI)
gcloud services enable sqladmin.googleapis.com
```

Or via Console:
1. Navigate to "APIs & Services" > "Library"
2. Search for "Cloud SQL Admin API"
3. Click "Enable"

### 2. Create Cloud SQL Instance

#### Via Console:
1. Navigate to "SQL" in the left sidebar
2. Click "Create Instance"
3. Choose "MySQL" (or PostgreSQL if preferred)
4. Select "MySQL 8.0"
5. Configure instance:
   - **Instance ID**: `finance-manager-db`
   - **Password**: Set a strong root password (save this securely!)
   - **Region**: Choose closest to your users (e.g., `asia-south1` for India)
   - **Zone**: Any (or specific for high availability)
   - **Database version**: MySQL 8.0
   - **Machine type**: Start with `db-f1-micro` (free tier eligible)
   - **Storage**: 10 GB SSD (can auto-increase)
6. Click "Create Instance" (takes 5-10 minutes)

#### Cost Estimation:
- `db-f1-micro`: ~$7-10/month (or free with credits)
- Storage: ~$0.17/GB/month
- Network egress: Varies by usage

### 3. Create Database
Once instance is created:
1. Click on your instance name
2. Go to "Databases" tab
3. Click "Create Database"
4. Database name: `financemanager`
5. Click "Create"

### 4. Create Database User
1. Go to "Users" tab
2. Click "Add User Account"
3. Username: `financeapp`
4. Password: Set a strong password (save this!)
5. Click "Add"

### 5. Configure Network Access

#### Option A: Cloud SQL Proxy (Recommended for Development)
The Cloud SQL Proxy provides secure access without exposing your database to the internet.

Download and install:
```bash
# Windows
curl -o cloud-sql-proxy.exe https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.x64.exe

# macOS
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Linux
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy
```

Run the proxy:
```bash
# Get your instance connection name from GCP Console (format: project:region:instance)
./cloud-sql-proxy --port 3306 PROJECT_ID:REGION:INSTANCE_NAME
```

#### Option B: Public IP (Not Recommended for Production)
1. Go to "Connections" tab
2. Enable "Public IP"
3. Add authorized networks:
   - Click "Add Network"
   - Name: "My Computer"
   - Network: Your public IP address (find at https://whatismyipaddress.com/)
   - Click "Done" then "Save"

## Phase 3: Database Schema Setup

### 1. Connect to Database
Using MySQL client:
```bash
# If using Cloud SQL Proxy
mysql -u financeapp -p -h 127.0.0.1 financemanager

# If using Public IP
mysql -u financeapp -p -h YOUR_INSTANCE_PUBLIC_IP financemanager
```

### 2. Create Tables
```sql
-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- Transactions table
CREATE TABLE transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    category VARCHAR(50) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, date),
    INDEX idx_type (type),
    INDEX idx_category (category)
);
```

## Phase 4: Backend API Setup

### 1. Create Backend Directory
```bash
cd C:\Users\User\Desktop\FinanceManager
mkdir backend
cd backend
```

### 2. Initialize Node.js Project
```bash
npm init -y
```

### 3. Install Dependencies
```bash
npm install express mysql2 dotenv cors bcrypt jsonwebtoken
npm install --save-dev nodemon
```

### 4. Create Environment Variables
Create `.env` file:
```env
# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=financeapp
DB_PASSWORD=your_database_password
DB_NAME=financemanager

# Cloud SQL Instance (if using Cloud SQL Proxy)
INSTANCE_CONNECTION_NAME=project-id:region:instance-name

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

### 5. Create Database Connection
Create `config/database.js`:
```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
```

### 6. Update package.json Scripts
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

## Phase 5: Deploy Backend (Optional)

### Option A: Cloud Run (Recommended)
1. Create `Dockerfile` in backend directory
2. Build and push to Google Container Registry
3. Deploy to Cloud Run
4. Update CORS settings with Cloud Run URL

### Option B: App Engine
1. Create `app.yaml`
2. Deploy with `gcloud app deploy`

### Option C: Compute Engine
1. Create VM instance
2. Install Node.js
3. Set up PM2 for process management
4. Configure firewall rules

## Phase 6: Frontend Integration

### 1. Update Frontend API Calls
Modify `Transaction/script.js` to use API endpoints instead of localStorage:
```javascript
const API_BASE_URL = 'http://localhost:3000/api'; // Change to production URL when deployed

// Example: Fetch transactions
async function fetchTransactions() {
  const response = await fetch(`${API_BASE_URL}/transactions`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  return await response.json();
}
```

### 2. Implement Authentication
Add login/signup pages and store JWT token in localStorage.

## Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use strong passwords** for database users
3. **Enable SSL/TLS** for database connections in production
4. **Implement rate limiting** on API endpoints
5. **Validate and sanitize** all user inputs
6. **Use prepared statements** to prevent SQL injection
7. **Enable Cloud SQL backups** (automated daily backups)
8. **Set up monitoring** with Cloud Monitoring
9. **Use Secret Manager** for production credentials

## Cost Optimization Tips

1. **Start small**: Use `db-f1-micro` instance
2. **Enable auto-scaling**: Only for production traffic
3. **Set up billing alerts**: Get notified at thresholds
4. **Use committed use discounts**: For long-term usage
5. **Delete unused resources**: Stop instances when not needed
6. **Monitor query performance**: Optimize slow queries
7. **Use connection pooling**: Reduce connection overhead

## Troubleshooting

### Can't connect to Cloud SQL
- Check firewall rules and authorized networks
- Verify Cloud SQL Proxy is running
- Check credentials in `.env` file
- Ensure Cloud SQL Admin API is enabled

### High latency
- Choose region closer to users
- Enable connection pooling
- Add database indexes
- Use caching (Redis/Memcached)

### Connection limits exceeded
- Increase connection pool size carefully
- Check for connection leaks in code
- Upgrade instance tier if needed

## Migration from localStorage

### 1. Export Existing Data
```javascript
// Run in browser console
const data = localStorage.getItem('transactions');
console.log(data);
// Copy the output
```

### 2. Create Migration Script
```javascript
// migrate.js
const transactions = JSON.parse(/* paste localStorage data */);

transactions.forEach(async (txn) => {
  await fetch('http://localhost:3000/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(txn)
  });
});
```

## Next Steps

1. Complete backend API implementation (see `implementation_plan.md`)
2. Test all endpoints with Postman
3. Implement authentication system
4. Add data validation and error handling
5. Deploy to production
6. Set up monitoring and logging
7. Implement automated backups
8. Add data export functionality

## Resources

- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Cloud SQL Pricing](https://cloud.google.com/sql/pricing)
- [Node.js MySQL2 Documentation](https://github.com/sidorares/node-mysql2)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
