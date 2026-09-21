export const SAMPLE_SNIPPETS = [
  {
    id: 'security-sqli',
    title: 'Node.js Express / SQL Injection & Unhandled Error',
    language: 'javascript',
    badge: 'Security Vulnerability',
    badgeColor: '#f43f5e',
    code: `const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

app.use(express.json());

const pool = mysql.createPool({
  host: 'localhost',
  user: 'admin',
  password: 'supersecretpassword123', // Hardcoded credentials
  database: 'ecommerce'
});

// Login endpoint with severe security flaws
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Vulnerable to SQL Injection via string concatenation
  const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
  
  try {
    const [rows] = await pool.query(query);
    if (rows.length > 0) {
      // Insecure: Returning raw user object including hashed passwords
      res.json({ success: true, user: rows[0] });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    // Leaking database error stack trace to client
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));`
  },
  {
    id: 'react-memory-leak',
    title: 'React Hook / Memory Leak & Infinite Re-render',
    language: 'typescript',
    badge: 'Performance & Bugs',
    badgeColor: '#f59e0b',
    code: `import React, { useState, useEffect, useCallback } from 'react';

interface UserData {
  id: string;
  name: string;
  online: boolean;
}

export const UserLiveDashboard: React.FC<{ pollInterval?: number }> = ({ pollInterval = 1000 }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Trap 1: users in dependency array causing infinite polling loop
  useEffect(() => {
    const fetchUsers = async () => {
      const response = await fetch('/api/active-users');
      const data = await response.json();
      setUsers(data);
      setActiveCount(data.filter((u: UserData) => u.online).length);
    };

    const interval = setInterval(() => {
      fetchUsers();
      // Trap 2: Direct state mutation and un-memoized object creation
      logs.push(\`Polled at \${new Date().toISOString()}\`);
      setLogs(logs);
    }, pollInterval);

    // Missing cleanup of interval on unmount or pollInterval change leads to memory leak
  }, [users, pollInterval]);

  return (
    <div className="dashboard-container">
      <h2>Active Users: {activeCount}</h2>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name} - {user.online ? '🟢 Online' : '⚪ Offline'}</li>
        ))}
      </ul>
    </div>
  );
};`
  },
  {
    id: 'python-complexity',
    title: 'Python / Quadratic Complexity & Resource Leak',
    language: 'python',
    badge: 'Big-O Inefficiency',
    badgeColor: '#a855f7',
    code: `import json
import time

def find_common_purchases(customer_orders_file, catalog_file):
    # Resource leak: File opened without context manager (with open)
    orders_data = json.load(open(customer_orders_file))
    catalog_data = json.load(open(catalog_file))
    
    common_items = []
    
    # Inefficient O(N * M) nested scan instead of O(1) set/dict lookup
    for order in orders_data:
        for item in order.get("items", []):
            item_id = item.get("id")
            for product in catalog_data.get("products", []):
                if product.get("id") == item_id:
                    # Inefficient linear search with list check (O(K))
                    if item_id not in [x["id"] for x in common_items]:
                        common_items.append({
                            "id": item_id,
                            "name": product.get("name"),
                            "price": product.get("price"),
                            "quantity": item.get("quantity")
                        })
                        
    return common_items

# Bare except clause hiding syntax/system errors
def process_data():
    try:
        results = find_common_purchases("orders.json", "catalog.json")
        print(f"Processed {len(results)} items")
    except:
        print("An error occurred")`
  },
  {
    id: 'clean-ts-service',
    title: 'TypeScript / Clean Architecture & High Quality',
    language: 'typescript',
    badge: 'Clean Code Demo',
    badgeColor: '#10b981',
    code: `export interface PaymentRequest {
  readonly amount: number;
  readonly currency: 'USD' | 'EUR' | 'GBP';
  readonly customerId: string;
  readonly idempotencyKey: string;
}

export interface PaymentResult {
  readonly transactionId: string;
  readonly status: 'SUCCESS' | 'FAILED';
  readonly timestamp: number;
}

export class PaymentProcessor {
  constructor(
    private readonly paymentGateway: { execute: (req: PaymentRequest) => Promise<PaymentResult> },
    private readonly logger: { info: (msg: string) => void; error: (msg: string, err?: unknown) => void }
  ) {}

  public async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    if (request.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    this.logger.info(\`Initiating payment of \${request.amount} \${request.currency} for customer \${request.customerId}\`);
    
    try {
      const result = await this.paymentGateway.execute(request);
      this.logger.info(\`Payment completed successfully with ID: \${result.transactionId}\`);
      return result;
    } catch (error) {
      this.logger.error(\`Failed to process payment for request \${request.idempotencyKey}\`, error);
      throw error;
    }
  }
}`
  }
];
