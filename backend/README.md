# Inventory Management System - Backend

## Overview
This is the backend API for the Inventory Management System built with Node.js, Express.js, and MongoDB.

## Features
- RESTful API for inventory management
- MongoDB database with Mongoose ODM
- CRUD operations for inventory items
- User authentication system
- Transaction logging
- Low stock alerts
- Branch-based inventory management

## Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB installation
- npm or yarn package manager

## Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd bakend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Update the MongoDB connection string:
   ```
   MONGODB_URI=your_mongodb_connection_string_here
   PORT=5005
   NODE_ENV=development
   ```

4. **Get MongoDB Connection String**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com/)
   - Create a free cluster
   - Get your connection string
   - Replace `<username>`, `<password>`, and `<cluster-url>` in the connection string

## Quick Start

### Option 1: With Sample Data (Recommended for testing)
```bash
# Initialize database with sample data
npm run init-db

# Start the server
npm start
```

### Option 2: Empty Database
```bash
# Just start the server
npm start
```

## API Endpoints

### Base URL
```
http://localhost:5005
```

### Health Check
- **GET** `/health` - Check server and database status

### Inventory Management
- **GET** `/api/inventory` - Get all inventory items
- **POST** `/api/inventory` - Create new inventory item
- **GET** `/api/inventory/:id` - Get specific inventory item
- **PUT** `/api/inventory/:id` - Update inventory item
- **DELETE** `/api/inventory/:id` - Delete inventory item

### Specialized Endpoints
- **GET** `/api/inventory/alerts/low-stock` - Get low stock items
- **GET** `/api/inventory/branch/:branch` - Get inventory by branch

## Sample API Usage

### Get All Inventory Items
```javascript
fetch('http://localhost:5005/api/inventory')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Create New Inventory Item
```javascript
const newItem = {
  name: 'New Product',
  category: 'Electronics',
  quantity: 100,
  lowStockThreshold: 10,
  price: 99.99,
  supplier: 'Tech Supplier',
  branch: 'Main Branch',
  description: 'Product description'
};

fetch('http://localhost:5005/api/inventory', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newItem)
})
.then(response => response.json())
.then(data => console.log(data));
```

## Database Schema

### Inventory Model
```javascript
{
  name: String (required),
  category: String (required),
  quantity: Number (required, min: 0),
  lowStockThreshold: Number (default: 10),
  price: Number (required, min: 0),
  supplier: String,
  branch: String,
  description: String,
  createdAt: Date,
  updatedAt: Date
}
```

### User Model
```javascript
{
  username: String (required, unique),
  email: String (required, unique),
  password: String (required),
  role: String (enum: ['admin', 'manager', 'user']),
  fullName: String,
  branch: String,
  isActive: Boolean,
  lastLogin: Date
}
```

### Transaction Model
```javascript
{
  item: ObjectId (ref: 'Inventory'),
  type: String (enum: ['IN', 'OUT', 'ADJUSTMENT']),
  quantity: Number (required),
  description: String,
  performedBy: ObjectId (ref: 'User'),
  timestamp: Date
}
```

## Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with nodemon
- `npm run init-db` - Initialize database with sample data

## Sample Data

After running `npm run init-db`, you'll have:

### Sample Inventory Items:
- Laptop - Dell XPS 13
- Office Chair - Ergonomic
- Wireless Mouse
- A4 Paper Pack
- Conference Table
- Desktop Computer
- Printer Ink Cartridge
- Monitor - 24 inch

### Sample Users:
- **admin** / admin123 (Admin role)
- **manager1** / manager123 (Manager role)
- **user1** / user123 (User role)

## Error Handling

The API returns standardized error responses:

```javascript
// Success Response
{
  "success": true,
  "data": {...},
  "message": "Optional success message"
}

// Error Response
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Testing the API

1. **Start the server**: `npm start`
2. **Check health**: Visit `http://localhost:5005/health`
3. **Get inventory**: Visit `http://localhost:5005/api/inventory`
4. **Use a REST client** like Postman or Thunder Client to test POST/PUT/DELETE operations

## Connecting to Frontend

Update your React frontend to use the API:

```javascript
// In your React components
const API_BASE_URL = 'http://localhost:5005/api';

// Fetch inventory
const fetchInventory = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/inventory`);
    const data = await response.json();
    if (data.success) {
      setInventoryItems(data.data);
    }
  } catch (error) {
    console.error('Error fetching inventory:', error);
  }
};
```

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in your environment variables
2. Use a production MongoDB cluster
3. Configure proper CORS settings
4. Set up proper logging
5. Use PM2 or similar process manager

## Troubleshooting

### Common Issues:

1. **MongoDB Connection Failed**
   - Check your MongoDB URI in `.env`
   - Ensure your IP is whitelisted in MongoDB Atlas
   - Verify username/password in connection string

2. **Port Already in Use**
   - Change the PORT in `.env` file
   - Kill process using the port: `netstat -ano | findstr :5005`

3. **Module Not Found**
   - Run `npm install` to ensure all dependencies are installed
   - Check that you're in the correct directory

## Support

For issues or questions, please check:
1. Console logs for detailed error messages
2. MongoDB Atlas connection settings
3. Environment variables configuration

---

Happy coding! 🚀


* Add the unit price to the inventory table and display the quantity in the popup window within the inventory section.