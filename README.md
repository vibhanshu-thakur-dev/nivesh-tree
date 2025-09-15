# Nivesh Tree - Investment Tracker

A comprehensive investment tracking platform that allows users to manage their investment portfolio across multiple platforms including Trading212 ISAs and tickertape.in mutual funds and stocks.

## Features

### 🏦 Multi-Platform Integration
- **Trading212 API Integration**: Real-time sync of ISA investments using [Trading212 Public API](https://t212public-api-docs.redoc.ly/)
- **Tickertape.in Integration**: Track mutual funds and Indian stocks
- **Manual Investment Entry**: Add custom investments

### 📊 Portfolio Management
- **Real-time Portfolio Tracking**: Monitor total net worth and individual investments
- **Performance Analytics**: Track gains/losses and return percentages
- **Historical Data**: View portfolio performance over time

### 🎯 Goal Setting & Tracking
- **Investment Goals**: Set financial targets and track progress
- **Portfolio Value Goals**: Target specific portfolio values
- **Individual Investment Goals**: Focus on specific stocks/funds
- **Progress Visualization**: Visual progress bars and completion tracking

### 📈 Data Visualization
- **Interactive Charts**: Bar charts, pie charts, and line graphs
- **Tabular Views**: Detailed investment tables with sorting and filtering
- **Export Functionality**: Download portfolio data as CSV

### 🔐 User Management
- **Secure Authentication**: JWT-based user authentication
- **User Profiles**: Manage personal information and preferences
- **Multi-user Support**: Individual portfolios for each user

## Tech Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database for data persistence
- **JWT** for authentication
- **Axios** for external API calls
- **bcryptjs** for password hashing

### Frontend
- **React 18** with functional components and hooks
- **Vite** for fast development and building
- **Tailwind CSS** for modern, responsive UI
- **Recharts** for data visualization
- **React Router** for navigation
- **Axios** for API communication

### DevOps
- **Docker** containerization
- **Docker Compose** for orchestration
- **Nginx** reverse proxy (optional)

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose (optional)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nivesh-tree
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

3. **Configure environment variables**
   ```bash
   cp server/config.env.example server/config.env
   # Edit server/config.env with your API keys
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on http://localhost:3001
   - Frontend development server on http://localhost:3000

### Docker Setup

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

2. **Access the application**
   - Application: http://localhost:3001
   - With Nginx: http://localhost:80

### Environment Variables

Create a `server/.env` file with the following variables:

```env
PORT=3001
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
TRADING212_API_KEY=your_trading212_api_key
TICKERTAPE_API_KEY=your_tickertape_api_key
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Investment Endpoints
- `GET /api/investments` - Get user investments
- `POST /api/investments` - Add new investment
- `PUT /api/investments/:id` - Update investment
- `DELETE /api/investments/:id` - Delete investment
- `POST /api/investments/sync/trading212` - Sync Trading212 data
- `POST /api/investments/sync/tickertape` - Sync tickertape data
- `GET /api/investments/portfolio/summary` - Get portfolio summary

### Trading212 API Endpoints
- `GET /api/investments/trading212/account` - Get Trading212 account info
- `GET /api/investments/trading212/instruments` - Get available instruments
- `GET /api/investments/trading212/orders` - Get order history (live API)
- `GET /api/investments/trading212/dividends` - Get dividend history
- `GET /api/investments/trading212/orders/stored` - Get stored historical orders from database
- `GET /api/investments/trading212/orders/stats` - Get order statistics and analytics
- `GET /api/investments/trading212/summary` - Get Trading212 data summary (for clear confirmation)
- `DELETE /api/investments/trading212/clear` - Clear all Trading212 synced data

### Goals Endpoints
- `GET /api/goals` - Get user goals
- `POST /api/goals` - Create new goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal
- `POST /api/goals/:id/update-progress` - Update goal progress
- `GET /api/goals/progress` - Get goal progress statistics

## Database Schema

The application uses SQLite with the following main tables:

- **users**: User accounts and authentication
- **investments**: Investment holdings and transactions
- **investment_accounts**: External account connections
- **investment_goals**: User-defined financial goals
- **portfolio_snapshots**: Historical portfolio data
- **trading212_orders**: Complete Trading212 order history with full details
- **api_usage**: API rate limiting tracking

## External API Integration

### Trading212 API
- **Historical Orders**: Fetches all historical orders using pagination from `/equity/history/orders`
- **Position Calculation**: Calculates current positions by analyzing buy/sell order history
- **Database Storage**: Stores all historical orders locally for fast access and analytics
- **Real-time Sync**: Syncs with Trading212 API to get latest order data
- **Analytics**: Provides order statistics, ticker breakdown, and trading patterns
- **Data Management**: Clear all synced data option for fresh imports and testing
- Requires API key from Trading212 with appropriate scopes

### Tickertape.in API
- Fetches Indian stock and mutual fund data
- Requires API key from tickertape.in
- Falls back to mock data for development

## Development

### Project Structure
```
nivesh-tree/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── ...
│   └── package.json
├── server/                 # Node.js backend
│   ├── database/           # Database schema and connection
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   ├── services/           # External API services
│   └── ...
├── docker-compose.yml      # Docker orchestration
├── Dockerfile             # Docker configuration
└── README.md
```

### Available Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run docker:build` - Build Docker image
- `npm run docker:up` - Start with Docker Compose
- `npm run docker:down` - Stop Docker containers

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Security headers via Helmet.js

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.

---

**Note**: This is a demo application. For production use, ensure you:
- Use strong, unique JWT secrets
- Configure proper SSL certificates
- Set up proper database backups
- Implement additional security measures
- Use environment-specific configuration
