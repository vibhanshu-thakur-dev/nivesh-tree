const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

class TickertapeService {
    constructor() {
        this.uploadDir = path.join(__dirname, '../uploads');
        this.ensureUploadDir();
    }

    ensureUploadDir() {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async parseCSVFile(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];
            let isHeaderFound = false;
            let headerColumns = [];
            let rowCount = 0;
            let fileType = null; // 'mutual_fund' or 'stock'
            
            // Read file line by line for better control
            const readline = require('readline');
            const fileStream = fs.createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });
            
            rl.on('line', (line) => {
                rowCount++;
                
                // Parse CSV line manually
                const columns = this.parseCSVLine(line);
                
                if (!isHeaderFound) {
                    // Detect file type based on header
                    if (columns.length > 10) {
                        if (columns[0] === 'Fund Name') {
                            fileType = 'mutual_fund';
                            isHeaderFound = true;
                            headerColumns = columns;
                            console.log('Detected Mutual Fund CSV format');
                        } else if (columns[0] === 'Security' && columns.includes('Quantity')) {
                            fileType = 'stock';
                            isHeaderFound = true;
                            headerColumns = columns;
                            console.log('Detected Stock CSV format');
                        }
                    }
                    return; // Skip this row
                }
                
                // Skip the total row (contains "Total" in first column)
                if (columns[0] && columns[0].toLowerCase().includes('total')) {
                    return;
                }
                
                // Skip empty rows
                if (!columns[0] || columns[0].trim() === '') {
                    return;
                }
                
                // Skip section headers
                if (columns[0] && (columns[0].includes('Stocks/ETFs') || columns[0].includes('Smallcases'))) {
                    return;
                }
                
                let investment;
                
                if (fileType === 'mutual_fund') {
                    investment = this.parseMutualFundRow(columns);
                } else if (fileType === 'stock') {
                    investment = this.parseStockRow(columns);
                } else {
                    return; // Skip if file type not detected
                }

                // Only add if we have essential data
                if (investment && investment.symbol && investment.name && investment.quantity > 0) {
                    results.push(investment);
                    console.log(`Parsed ${fileType}: ${investment.name} - Quantity: ${investment.quantity}, Current Value: ${investment.currency}${investment.totalValue}`);
                }
            });
            
            rl.on('close', () => {
                console.log(`Parsed ${results.length} ${fileType} investments from CSV`);
                resolve(results);
            });
            
            rl.on('error', (error) => {
                console.error('CSV parsing error:', error);
                reject(new Error('Failed to parse CSV file'));
            });
        });
    }

    parseMutualFundRow(columns) {
        // Parse mutual fund data from the CSV format
        const fundName = columns[0]?.trim();
        const amcName = columns[1]?.trim();
        const category = columns[2]?.trim();
        const subCategory = columns[3]?.trim();
        const planType = columns[4]?.trim();
        const optionType = columns[5]?.trim();
        const nav = parseFloat(columns[6]?.replace(/,/g, '') || 0);
        const units = parseFloat(columns[7]?.replace(/,/g, '') || 0);
        const investedAmount = parseFloat(columns[8]?.replace(/,/g, '') || 0);
        const currentValue = parseFloat(columns[9]?.replace(/,/g, '') || 0);
        const weight = parseFloat(columns[10]?.replace(/,/g, '') || 0);
        const pnl = parseFloat(columns[11]?.replace(/,/g, '') || 0);
        const pnlPercent = parseFloat(columns[12]?.replace(/,/g, '') || 0);
        const xirr = parseFloat(columns[13]?.replace(/,/g, '') || 0);
        const investedSince = columns[14]?.trim();
        
        return {
            symbol: this.generateSymbolFromFundName(fundName),
            name: fundName,
            quantity: units,
            averagePrice: units > 0 ? investedAmount / units : 0,
            currentPrice: nav,
            currency: 'INR',
            investmentType: 'mutual_fund',
            totalValue: currentValue,
            // Additional mutual fund specific data
            amcName: amcName,
            category: category,
            subCategory: subCategory,
            planType: planType,
            optionType: optionType,
            investedAmount: investedAmount,
            weight: weight,
            pnl: pnl,
            pnlPercent: pnlPercent,
            xirr: xirr,
            investedSince: investedSince
        };
    }

    parseStockRow(columns) {
        // Parse stock data from the CSV format
        const security = columns[0]?.trim();
        const noOfSmallcases = parseFloat(columns[1]?.replace(/,/g, '') || 0);
        const quantity = parseFloat(columns[2]?.replace(/,/g, '') || 0);
        const averageCost = parseFloat(columns[3]?.replace(/,/g, '') || 0);
        const portfolioWeight = parseFloat(columns[4]?.replace(/,/g, '') || 0);
        const ltp = parseFloat(columns[5]?.replace(/,/g, '') || 0);
        const investedValue = parseFloat(columns[6]?.replace(/,/g, '') || 0);
        const currentValue = parseFloat(columns[7]?.replace(/,/g, '') || 0);
        const pnl = parseFloat(columns[8]?.replace(/,/g, '') || 0);
        const netChangePercent = parseFloat(columns[9]?.replace(/,/g, '') || 0);
        const dailyChange = parseFloat(columns[10]?.replace(/,/g, '') || 0);
        const dailyChangePercent = parseFloat(columns[11]?.replace(/,/g, '') || 0);
        
        return {
            symbol: security,
            name: security,
            quantity: quantity,
            averagePrice: averageCost,
            currentPrice: ltp,
            currency: 'INR',
            investmentType: 'stock',
            totalValue: currentValue,
            // Additional stock specific data
            noOfSmallcases: noOfSmallcases,
            portfolioWeight: portfolioWeight,
            investedValue: investedValue,
            pnl: pnl,
            netChangePercent: netChangePercent,
            dailyChange: dailyChange,
            dailyChangePercent: dailyChangePercent
        };
    }
    
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    generateSymbolFromFundName(fundName) {
        if (!fundName) return 'UNKNOWN';
        
        // Extract key words from fund name to create a symbol
        const words = fundName.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special characters
            .split(/\s+/)
            .filter(word => word.length > 2) // Filter out short words
            .filter(word => !['fund', 'scheme', 'plan', 'direct', 'growth', 'dividend'].includes(word)); // Remove common words
        
        // Take first 2-3 meaningful words and create symbol
        const symbolWords = words.slice(0, 3);
        return symbolWords.map(word => word.substring(0, 4)).join('_').toUpperCase();
    }

    determineInvestmentType(data) {
        const name = (data.name || data.Name || '').toLowerCase();
        const symbol = (data.symbol || data.Symbol || '').toLowerCase();
        const type = (data.type || data.Type || '').toLowerCase();
        
        // Check explicit type field first
        if (type) {
            if (type.includes('mutual') || type.includes('fund')) {
                return 'mutual_fund';
            } else if (type.includes('etf')) {
                return 'etf';
            } else if (type.includes('stock') || type.includes('equity')) {
                return 'stock';
            } else if (type.includes('bond')) {
                return 'bond';
            }
        }
        
        // Check name and symbol for keywords
        const fundKeywords = ['fund', 'mutual', 'scheme', 'plan', 'growth', 'dividend', 'equity fund', 'debt fund', 'hybrid fund'];
        const etfKeywords = ['etf', 'exchange traded', 'index fund'];
        const bondKeywords = ['bond', 'debenture', 'fixed income', 'government security'];
        
        const allText = `${name} ${symbol}`.toLowerCase();
        
        if (fundKeywords.some(keyword => allText.includes(keyword))) {
            return 'mutual_fund';
        } else if (etfKeywords.some(keyword => allText.includes(keyword))) {
            return 'etf';
        } else if (bondKeywords.some(keyword => allText.includes(keyword))) {
            return 'bond';
        } else {
            return 'stock';
        }
    }

    async saveUploadedFile(file) {
        const fileName = `tickertape_${Date.now()}_${file.originalname}`;
        const filePath = path.join(this.uploadDir, fileName);
        
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, file.buffer, (error) => {
                if (error) {
                    reject(new Error('Failed to save uploaded file'));
                } else {
                    resolve(filePath);
                }
            });
        });
    }

    async cleanupFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Cleaned up file: ${filePath}`);
            }
        } catch (error) {
            console.error('Error cleaning up file:', error);
        }
    }

    // Mock data for development when API key is not available
    getMockStocks() {
        return [
            {
                symbol: 'RELIANCE',
                name: 'Reliance Industries Ltd',
                currentPrice: 2450.50,
                currency: 'INR',
                investmentType: 'stock',
                change: 25.30,
                changePercent: 1.04
            },
            {
                symbol: 'TCS',
                name: 'Tata Consultancy Services Ltd',
                currentPrice: 3650.75,
                currency: 'INR',
                investmentType: 'stock',
                change: -15.25,
                changePercent: -0.42
            },
            {
                symbol: 'HDFC',
                name: 'HDFC Bank Ltd',
                currentPrice: 1580.20,
                currency: 'INR',
                investmentType: 'stock',
                change: 8.50,
                changePercent: 0.54
            }
        ];
    }

    getMockMutualFunds() {
        return [
            {
                symbol: 'HDFC_TOP_100',
                name: 'HDFC Top 100 Fund',
                currentPrice: 125.45,
                currency: 'INR',
                investmentType: 'mutual_fund',
                change: 0.85,
                changePercent: 0.68
            },
            {
                symbol: 'SBI_BLUECHIP',
                name: 'SBI Bluechip Fund',
                currentPrice: 89.32,
                currency: 'INR',
                investmentType: 'mutual_fund',
                change: -0.45,
                changePercent: -0.50
            }
        ];
    }
}

module.exports = new TickertapeService();
