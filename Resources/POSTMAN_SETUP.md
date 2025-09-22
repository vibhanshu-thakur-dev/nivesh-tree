# Nivesh Tree API - Postman Collection Setup

This document provides instructions for setting up and using the Nivesh Tree API Postman collection.

## Files Included

1. **Nivesh-Tree-API.postman_collection.json** - Complete API collection with all endpoints
2. **Nivesh-Tree-Environment.postman_environment.json** - Environment variables for configuration
3. **POSTMAN_SETUP.md** - This setup guide

## Quick Setup

### 1. Import Collection and Environment

1. Open Postman
2. Click **Import** button
3. Import both files:
   - `Nivesh-Tree-API.postman_collection.json`
   - `Nivesh-Tree-Environment.postman_environment.json`

### 2. Configure Environment

1. Select the **"Nivesh Tree Environment"** from the environment dropdown
2. Update the `baseUrl` variable to match your server:
   - **Development**: `http://localhost:5000`
   - **Production**: `https://your-domain.com`

### 3. Authentication Setup

The collection includes automatic token management:

1. **Login or Register** first to get an authentication token
2. The token is automatically stored in the `authToken` environment variable
3. All subsequent requests will use this token automatically

## Collection Structure

The collection is organized into the following folders:

### 📁 System
- **Health Check** - Server health status
- **Data Status** - Data initialization status

### 📁 Auth
- **Register** - Create new user account
- **Login** - Authenticate user (auto-stores token)
- **Get Current User** - Get authenticated user info
- **Update Profile** - Update user profile

### 📁 Households
- **Get Household** - Get household information
- **Update Household** - Update household details
- **Get Members** - Get all household members
- **Add Member** - Add new member to household
- **Update Member** - Update member information
- **Delete Member** - Remove member from household

### 📁 Investments
- **Get All Investments** - List all investments
- **Add Investment** - Create new investment (supports cash/fixed deposits with bank details)
- **Update Investment** - Update existing investment
- **Delete Investment** - Remove investment
- **Get Portfolio Summary** - Get portfolio overview
- **Sync Trading212** - Sync Trading212 investments
- **Import Tickertape CSV** - Import investments from CSV
- **Trading212 Endpoints** - Various Trading212 API endpoints
- **Data Management** - Clear data endpoints

### 📁 Goals
- **Get All Goals** - List all financial goals
- **Create Goal** - Create new financial goal
- **Update Goal** - Update existing goal
- **Delete Goal** - Remove goal
- **Update Goal Progress** - Update goal progress based on portfolio
- **Get Goal Progress** - Get goal progress statistics

### 📁 Stock Symbols
- **Get All Stock Symbols** - List stock symbols with filtering
- **Get by Ticker** - Get specific stock symbol
- **Get by ID** - Get stock symbol by ID
- **Create/Update/Delete** - Manage stock symbols
- **Statistics** - Get stock symbol statistics

### 📁 API Keys
- **Get API Keys** - Get user's API key status
- **Update API Keys** - Update Trading212/Tickertape keys
- **Delete API Key** - Remove specific API key
- **Test Trading212** - Test Trading212 API key

### 📁 Member API Keys
- **Get Member API Keys** - Get member's API key status
- **Update Member API Keys** - Update member's API keys
- **Delete Member API Key** - Remove member's API key
- **Test Member Trading212** - Test member's Trading212 key

### 📁 Currency
- **Get Supported Currencies** - List supported currencies
- **Get Exchange Rates** - Get current exchange rates
- **Convert Currency** - Convert between currencies
- **Convert Portfolio** - Convert portfolio data to target currency

## Environment Variables

### Core Configuration
- `baseUrl` - API server URL (configurable)
- `authToken` - JWT token (auto-managed)
- `userId` - Current user ID (auto-managed)

### Authentication
- `username` - Login username
- `email` - User email
- `password` - Login password
- `firstName` - User first name
- `lastName` - User last name

### Household & Members
- `householdName` - Household name
- `householdDescription` - Household description
- `memberId` - Member ID for operations
- `memberName` - Member name
- `memberEmail` - Member email
- `memberRole` - Member role (admin/member)

### Investments
- `investmentId` - Investment ID
- `investmentSymbol` - Investment symbol (e.g., AAPL)
- `investmentName` - Investment name
- `investmentType` - Type (stock, mutual_fund, isa, etf, cash, fixed_deposits)
- `investmentQuantity` - Investment quantity
- `investmentAveragePrice` - Average purchase price
- `investmentCurrentPrice` - Current market price
- `investmentCurrency` - Currency (USD, EUR, GBP, INR, GBX)
- `bankName` - Bank name (for cash/fixed deposits)
- `accountType` - Account type (savings/current)

### Goals
- `goalId` - Goal ID
- `goalTitle` - Goal title
- `goalTargetAmount` - Target amount
- `goalTargetDate` - Target date (ISO format)
- `goalCategory` - Goal category
- `goalCurrentAmount` - Current progress amount

### API Keys
- `trading212ApiKey` - Trading212 API key
- `tickertapeApiKey` - Tickertape API key
- `platform` - Platform name (trading212/tickertape)

### Currency & Conversion
- `amount` - Amount to convert
- `fromCurrency` - Source currency
- `toCurrency` - Target currency
- `targetCurrency` - Portfolio target currency

## Usage Examples

### 1. Complete Authentication Flow
```
1. POST /api/auth/register (or /api/auth/login)
2. Token automatically stored in environment
3. All subsequent requests use the token
```

### 2. Add Cash Investment
```
1. Set investmentType = "cash"
2. Set amount = "1000"
3. Set bankName = "Chase Bank"
4. Set accountType = "savings"
5. POST /api/investments
```

### 3. Add Fixed Deposit
```
1. Set investmentType = "fixed_deposits"
2. Set amount = "5000"
3. Set bankName = "Bank of America"
4. Set accountType = "current"
5. POST /api/investments
```

### 4. Sync Trading212
```
1. Set trading212ApiKey in environment
2. Set memberId = "member_id_here"
3. POST /api/investments/sync/trading212
```

### 5. Import CSV
```
1. Set memberId = "member_id_here"
2. Select CSV file in form data
3. POST /api/investments/import/tickertape
```

## Features

### 🔐 Automatic Authentication
- Login/Register requests automatically store JWT tokens
- All authenticated requests use the stored token
- No manual token management required

### 🏗️ Organized Structure
- Endpoints grouped by functionality
- Clear naming conventions
- Easy to navigate and understand

### 🌍 Environment Management
- Configurable base URL for different environments
- All variables pre-configured with sensible defaults
- Easy to switch between development/production

### 💰 Investment Types Support
- Traditional investments (stocks, mutual funds, ETFs, ISAs)
- **NEW**: Cash investments with bank details
- **NEW**: Fixed deposits with bank details
- All types properly validated and handled

### 📊 Comprehensive Coverage
- All API endpoints included
- Trading212 integration endpoints
- Currency conversion endpoints
- Portfolio management endpoints
- Goal tracking endpoints

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Ensure you've logged in first
   - Check that `authToken` is set in environment
   - Verify token hasn't expired (7-day expiry)

2. **404 Not Found**
   - Check `baseUrl` is correct
   - Ensure server is running
   - Verify endpoint paths

3. **400 Bad Request**
   - Check required fields are provided
   - Validate data types (numbers, dates, etc.)
   - Review validation error messages

4. **CSV Import Issues**
   - Ensure CSV file is properly formatted
   - Check file size limits (5MB max)
   - Verify memberId is set

### Environment Setup

For different environments, update the `baseUrl`:

```json
{
  "development": "http://localhost:5000",
  "staging": "https://staging.nivesh-tree.com",
  "production": "https://nivesh-tree.com"
}
```

## Advanced Usage

### Custom Scripts

The collection includes test scripts for automatic token management. You can add custom scripts to any request:

```javascript
// Example: Store response data
if (pm.response.code === 200) {
    const responseJson = pm.response.json();
    pm.environment.set('memberId', responseJson.member._id);
}
```

### Pre-request Scripts

Add pre-request scripts for dynamic values:

```javascript
// Example: Generate random investment symbol
const randomId = Math.floor(Math.random() * 10000);
pm.environment.set('investmentSymbol', `TEST${randomId}`);
```

## Support

For issues or questions:
1. Check the API documentation
2. Review server logs
3. Verify environment variables
4. Test with simple endpoints first (health check)

---

**Happy Testing! 🚀**
