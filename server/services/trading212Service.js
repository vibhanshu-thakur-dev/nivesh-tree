const axios = require('axios');

class Trading212Service {
    constructor(apiKey = null) {
        this.baseURL = 'https://live.trading212.com/api/v0';
        this.apiKey = apiKey || process.env.TRADING212_API_KEY;
        this.instrumentsCache = new Map();
        this.cacheExpiry = null;
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    }

    async getAccountInfo() {
        try {
            const response = await axios.get(`${this.baseURL}/equity/account/cash`, {
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Trading212 Account Info Error:', error.message);
            throw new Error('Failed to fetch Trading212 account info');
        }
    }

    async fetchInstruments() {
        try {
            // Check if cache is still valid
            if (this.instrumentsCache.size > 0 && this.cacheExpiry && Date.now() < this.cacheExpiry) {
                return this.instrumentsCache;
            }

            console.log('Fetching Trading212 instruments...');
            const response = await axios.get(`${this.baseURL}/equity/metadata/instruments`, {
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });

            // Clear existing cache
            this.instrumentsCache.clear();
            
            // Cache the instruments
            response.data.forEach(instrument => {
                this.instrumentsCache.set(instrument.ticker, {
                    name: instrument.name,
                    shortName: instrument.shortName,
                    isin: instrument.isin
                });
            });

            this.cacheExpiry = Date.now() + this.CACHE_DURATION;
            console.log(`Cached ${this.instrumentsCache.size} instruments`);
            
            return this.instrumentsCache;
        } catch (error) {
            console.error('Trading212 Instruments Error:', error.message);
            throw new Error('Failed to fetch Trading212 instruments');
        }
    }

    getInstrumentName(ticker) {
        const instrument = this.instrumentsCache.get(ticker);
        return instrument ? instrument.name : ticker;
    }

    async getAllHistoricalOrders() {
        try {
            let allOrders = [];
            let cursor = null;
            let pageCount = 0;
            const maxPages = 500; // Increased limit for full sync
            
            do {
                let url;
                if (cursor && cursor.startsWith('/api/')) {
                    // If cursor is a full path, use it directly (but remove the /api/v0 prefix since baseURL already has it)
                    const cleanPath = cursor.replace('/api/v0', '');
                    url = `${this.baseURL}${cleanPath}`;
                } else if (cursor) {
                    // If cursor is just a value, append it as parameter
                    url = `${this.baseURL}/equity/history/orders?limit=50&cursor=${cursor}`;
                } else {
                    // First page
                    url = `${this.baseURL}/equity/history/orders?limit=50`;
                }
                
                console.log(`Fetching page ${pageCount + 1}: ${url}`);
                
                try {
                    const response = await axios.get(url, {
                        headers: {
                            'Authorization': this.apiKey,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const data = response.data;
                    const items = data.items || [];
                    allOrders = allOrders.concat(items);
                    
                    // Check for next page using cursor or nextPagePath
                    cursor = data.cursor || data.nextPagePath;
                    pageCount++;
                    
                    console.log(`Fetched page ${pageCount}, orders: ${items.length}, total: ${allOrders.length}`);
                    console.log(`Next cursor: ${cursor}`);
                    
                    // If no more data or we've hit our limit, break
                    if (!cursor || items.length === 0 || pageCount >= maxPages) {
                        console.log(`Stopping pagination. Reason: ${!cursor ? 'No cursor' : items.length === 0 ? 'No items' : 'Max pages reached'}`);
                        break;
                    }
                    
                } catch (pageError) {
                    console.error(`Error fetching page ${pageCount + 1}:`, pageError.message);
                    console.error(`Error details:`, pageError.response?.data);
                    console.error(`Error status:`, pageError.response?.status);
                    
                    // If it's a 500 error and we have some data, continue with what we have
                    if (pageError.response?.status === 500 && allOrders.length > 0) {
                        console.log(`Received 500 error on page ${pageCount + 1}, but we have ${allOrders.length} orders. Stopping pagination.`);
                        break;
                    }
                    
                    // For other errors, throw them
                    throw pageError;
                }
                
                // Add a longer delay to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } while (cursor && pageCount < maxPages);
            
            console.log(`Total orders fetched: ${allOrders.length} across ${pageCount} pages`);
            return allOrders;
        } catch (error) {
            console.error('Trading212 Historical Orders Error:', error.message);
            console.error('Error details:', error.response?.data);
            console.error('Error status:', error.response?.status);
            throw new Error('Failed to fetch Trading212 historical orders');
        }
    }

    async getPositions(orders = null) {
        try {
            // Fetch instruments first to get proper names (only if not already cached)
            if (this.instrumentsCache.size === 0) {
                try {
                    await this.fetchInstruments();
                } catch (instrumentsError) {
                    console.warn('Could not fetch instruments, using ticker symbols as names:', instrumentsError.message);
                    // Continue without instrument names
                }
            }
            
            // If no orders provided, try to get them
            let allOrders = orders;
            if (!allOrders) {
                try {
                    allOrders = await this.getAllHistoricalOrders();
                } catch (orderError) {
                    console.log('Could not fetch historical orders, trying portfolio endpoint...');
                    return await this.getPositionsFromPortfolio();
                }
            }
            
            // Group orders by ticker and calculate net positions
            const positionMap = new Map();
            
            allOrders.forEach(order => {
                if (!order.ticker || order.status !== 'FILLED') return;
                
                const ticker = order.ticker;
                if (!positionMap.has(ticker)) {
                    positionMap.set(ticker, {
                        ticker: ticker,
                        totalQuantity: 0,
                        totalInvested: 0,
                        orders: []
                    });
                }
                
                const position = positionMap.get(ticker);
                position.orders.push(order);
                
                // Calculate net quantity based on order type
                // For Trading212, we need to calculate quantity from value and price
                const value = parseFloat(order.filledValue) || 0;
                const price = parseFloat(order.fillPrice) || 0;
                const quantity = price > 0 ? value / price : 0;
                
                // Determine if this is a buy or sell order
                // For Trading212, we need to check the fillType or use a different logic
                const isBuyOrder = order.fillType === 'BUY' || 
                                 order.fillType === 'OTC' || 
                                 order.fillType === 'MARKET' ||
                                 order.type === 'BUY' ||
                                 order.type === 'MARKET';
                
                if (isBuyOrder) {
                    position.totalQuantity += quantity;
                    position.totalInvested += value;
                } else if (order.fillType === 'SELL' || order.type === 'SELL') {
                    position.totalQuantity -= quantity;
                    position.totalInvested -= value;
                }
            });
            
            // Convert to our format and filter out zero positions
            const positions = Array.from(positionMap.values())
                .filter(pos => pos.totalQuantity > 0)
                .map(position => {
                    const avgPrice = position.totalQuantity > 0 
                        ? position.totalInvested / position.totalQuantity 
                        : 0;
                    
                    const totalValueUSD = position.totalQuantity * avgPrice;
                    const totalValueGBP = totalValueUSD * 0.79; // Approximate USD to GBP conversion
                    
                    return {
                        symbol: position.ticker,
                        name: this.getInstrumentName(position.ticker),
                        quantity: position.totalQuantity,
                        averagePrice: avgPrice,
                        currentPrice: avgPrice, // We'll need to get current prices separately
                        totalValue: totalValueUSD,
                        totalValueGBP: totalValueGBP,
                        currency: 'USD',
                        investmentType: 'isa',
                        orderCount: position.orders.length
                    };
                });
            
            return positions;
        } catch (error) {
            console.error('Trading212 Positions Error:', error.message);
            throw new Error('Failed to fetch Trading212 positions');
        }
    }

    async getPositionsFromPortfolio() {
        try {
            // Fallback method using the portfolio endpoint
            const response = await axios.get(`${this.baseURL}/equity/portfolio`, {
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            // Map Trading212 portfolio data to our format
            return response.data.map(position => ({
                symbol: position.ticker,
                name: position.ticker,
                quantity: parseFloat(position.quantity),
                averagePrice: parseFloat(position.averagePrice),
                currentPrice: parseFloat(position.currentPrice),
                initialValue: parseFloat(position.quantity) * parseFloat(position.averagePrice),
                finalValue: parseFloat(position.quantity) * parseFloat(position.currentPrice),
                investmentType: 'isa',
                sourceSystem: 'trading212',
                sourceCountry: "UK"
            }));
        } catch (error) {
            console.error('Trading212 Portfolio Error:', error.message);
            throw new Error('Failed to fetch Trading212 portfolio');
        }
    }

    async getHistoricalData(symbol, period = '1Y') {
        try {
            // Trading212 doesn't have a direct historical data endpoint in the public API
            // We'll use the order history as a proxy for historical data
            const response = await axios.get(`${this.baseURL}/equity/history/orders`, {
                params: {
                    ticker: symbol,
                    limit: 100
                },
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Trading212 Historical Data Error:', error.message);
            throw new Error('Failed to fetch historical data from Trading212');
        }
    }

    async getInstruments() {
        try {
            const response = await axios.get(`${this.baseURL}/equity/metadata/instruments`, {
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Trading212 Instruments Error:', error.message);
            throw new Error('Failed to fetch instruments from Trading212');
        }
    }

    async getSpecificPosition(ticker) {
        try {
            const response = await axios.get(`${this.baseURL}/equity/portfolio/${ticker}`, {
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Trading212 Specific Position Error:', error.message);
            throw new Error('Failed to fetch specific position from Trading212');
        }
    }

    async getOrderHistory(ticker = null, limit = 20) {
        try {
            const params = { limit };
            if (ticker) params.ticker = ticker;
            
            const response = await axios.get(`${this.baseURL}/equity/history/orders`, {
                params,
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Trading212 Order History Error:', error.message);
            throw new Error('Failed to fetch order history from Trading212');
        }
    }

    async getDividends(ticker = null, limit = 20) {
        try {
            const params = { limit };
            if (ticker) params.ticker = ticker;
            
            const response = await axios.get(`${this.baseURL}/history/dividends`, {
                params,
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Trading212 Dividends Error:', error.message);
            throw new Error('Failed to fetch dividends from Trading212');
        }
    }

    async storeHistoricalOrdersInDatabase(userId, database, orders = null) {
        try {
            const allOrders = orders || await this.getAllHistoricalOrders();
            
            // Prepare orders for bulk insert
            const ordersToStore = allOrders.map(order => ({
                userId: userId,
                orderId: order.id,
                ticker: order.ticker || 'UNKNOWN',
                instrumentCode: order.instrumentCode || null,
                orderType: this.mapOrderType(order.type),
                fillType: order.fillType || null,
                orderedQuantity: order.orderedQuantity || 0,
                filledQuantity: order.filledQuantity || 0,
                fillPrice: order.fillPrice || null,
                filledValue: order.filledValue || null,
                status: this.mapOrderStatus(order.status),
                orderTime: order.dateCreated ? new Date(order.dateCreated) : new Date(),
                fillTime: order.dateExecuted ? new Date(order.dateExecuted) : null,
                fees: order.fees || 0,
                currency: order.currency || 'USD',
                notes: order.executor || null,
                metadata: {
                    taxes: order.taxes || [],
                    originalData: order
                }
            }));
            
            // Store orders one by one with upsert to handle duplicates
            for (const orderData of ordersToStore) {
                try {
                    await database.models.Trading212Order.findOneAndUpdate(
                        { orderId: orderData.orderId, userId: orderData.userId },
                        orderData,
                        { upsert: true, new: true }
                    );
                } catch (orderError) {
                    console.error(`Error storing order ${orderData.orderId}:`, orderError.message);
                }
            }
            
            console.log(`Stored ${allOrders.length} orders in database for user ${userId}`);
            return allOrders;
        } catch (error) {
            console.error('Error storing historical orders:', error.message);
            throw new Error('Failed to store Trading212 historical orders');
        }
    }

    // Helper methods to map API values to our schema
    mapOrderType(apiType) {
        const typeMap = {
            'BUY': 'BUY',
            'SELL': 'SELL',
            'DIVIDEND': 'DIVIDEND',
            'DIVIDEND_REINVESTMENT': 'DIVIDEND_REINVESTMENT'
        };
        return typeMap[apiType] || 'OTHER';
    }

    mapOrderStatus(apiStatus) {
        const statusMap = {
            'PENDING': 'PENDING',
            'FILLED': 'FILLED',
            'PARTIALLY_FILLED': 'PARTIALLY_FILLED',
            'CANCELLED': 'CANCELLED',
            'REJECTED': 'REJECTED'
        };
        return statusMap[apiStatus] || 'OTHER';
    }

    // Mock data for development when API key is not available
    getMockPositions() {
        return [
            {
                symbol: 'AAPL',
                name: 'Apple Inc.',
                quantity: 10,
                averagePrice: 150.00,
                currentPrice: 175.50,
                totalValue: 1755.00,
                currency: 'USD',
                investmentType: 'isa'
            },
            {
                symbol: 'TSLA',
                name: 'Tesla Inc.',
                quantity: 5,
                averagePrice: 200.00,
                currentPrice: 250.75,
                totalValue: 1253.75,
                currency: 'USD',
                investmentType: 'isa'
            },
            {
                symbol: 'MSFT',
                name: 'Microsoft Corporation',
                quantity: 8,
                averagePrice: 300.00,
                currentPrice: 320.25,
                totalValue: 2562.00,
                currency: 'USD',
                investmentType: 'isa'
            }
        ];
    }
}

module.exports = Trading212Service;
