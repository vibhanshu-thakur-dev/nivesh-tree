const axios = require('axios');

class CurrencyService {
    constructor() {
        this.exchangeRates = {
            // Base rates (as of 2024 - these should be updated with real-time data)
            USD: 1.0,
            EUR: 0.85,
            GBP: 0.79,
            INR: 83.0,
            GBX: 0.79 // 1 GBX = 0.01 GBP
        };
        this.lastUpdated = null;
        this.updateInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }

    async getExchangeRates() {
        try {
            // Check if we need to update rates
            const now = new Date();
            if (this.lastUpdated && (now - this.lastUpdated) < this.updateInterval) {
                return this.exchangeRates;
            }

            // Try to get real-time rates from a free API
            try {
                const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
                    timeout: 5000
                });
                
                if (response.data && response.data.rates) {
                    this.exchangeRates = {
                        USD: 1.0,
                        EUR: response.data.rates.EUR || 0.85,
                        GBP: response.data.rates.GBP || 0.79,
                        INR: response.data.rates.INR || 83.0,
                        GBX: (response.data.rates.GBP || 0.79) * 100 // 1 GBX = 0.01 GBP
                    };
                    this.lastUpdated = now;
                    console.log('Updated exchange rates from API:', this.exchangeRates);
                }
            } catch (apiError) {
                console.warn('Failed to fetch real-time exchange rates, using cached rates:', apiError.message);
            }

            return this.exchangeRates;
        } catch (error) {
            console.error('Error getting exchange rates:', error);
            return this.exchangeRates; // Return cached rates as fallback
        }
    }

    async convertCurrency(amount, fromCurrency, toCurrency) {
        if (!amount || amount === 0) return 0;
        if (fromCurrency === toCurrency) return amount;

        const rates = await this.getExchangeRates();
        
        // Convert to USD first, then to target currency
        const usdAmount = amount / (rates[fromCurrency] );
        const convertedAmount = usdAmount * (rates[toCurrency] );
        
        return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
    }

    async convertInvestmentData(investment, targetCurrency) {
        const rates = await this.getExchangeRates();
        const originalCurrency = investment.currency || 'USD';
        
        if (originalCurrency === targetCurrency) {
            return investment;
        }

        const convertedInvestment = { ...investment };
        
        // Convert all monetary values
        if (investment.averagePrice) {
            convertedInvestment.averagePrice = await this.convertCurrency(
                investment.averagePrice, 
                originalCurrency, 
                targetCurrency
            );
        }
        
        if (investment.currentPrice) {
            convertedInvestment.currentPrice = await this.convertCurrency(
                investment.currentPrice, 
                originalCurrency, 
                targetCurrency
            );
        }
        
        if (investment.totalValue) {
            convertedInvestment.totalValue = await this.convertCurrency(
                investment.totalValue, 
                originalCurrency, 
                targetCurrency
            );
        }

        // Update currency field
        convertedInvestment.currency = targetCurrency;
        
        return convertedInvestment;
    }

    async convertPortfolioData(portfolioData, targetCurrency) {
        const convertedData = { ...portfolioData };
        
        // Convert investments
        if (portfolioData.investments && Array.isArray(portfolioData.investments)) {
            convertedData.investments = await Promise.all(
                portfolioData.investments.map(investment => 
                    this.convertInvestmentData(investment, targetCurrency)
                )
            );
        }
        
        // Convert summary totals
        if (portfolioData.totalValue) {
            convertedData.totalValue = await this.convertCurrency(
                portfolioData.totalValue, 
                'GBP', // Assuming current totals are in GBP
                targetCurrency
            );
        }
        
        if (portfolioData.totalInvested) {
            convertedData.totalInvested = await this.convertCurrency(
                portfolioData.totalInvested, 
                'GBP', 
                targetCurrency
            );
        }
        
        if (portfolioData.totalGainLoss) {
            convertedData.totalGainLoss = await this.convertCurrency(
                portfolioData.totalGainLoss, 
                'GBP', 
                targetCurrency
            );
        }

        // Convert member data
        if (portfolioData.members && Array.isArray(portfolioData.members)) {
            convertedData.members = await Promise.all(
                portfolioData.members.map(async (member) => {
                    const convertedMember = { ...member };
                    
                    if (member.totalValue) {
                        convertedMember.totalValue = await this.convertCurrency(
                            member.totalValue, 
                            'GBP', 
                            targetCurrency
                        );
                    }
                    
                    if (member.totalInvested) {
                        convertedMember.totalInvested = await this.convertCurrency(
                            member.totalInvested, 
                            'GBP', 
                            targetCurrency
                        );
                    }
                    
                    if (member.totalGainLoss) {
                        convertedMember.totalGainLoss = await this.convertCurrency(
                            member.totalGainLoss, 
                            'GBP', 
                            targetCurrency
                        );
                    }
                    
                    return convertedMember;
                })
            );
        }
        
        return convertedData;
    }

    getCurrencySymbol(currency) {
        const symbols = {
            USD: '$',
            EUR: '€',
            GBP: '£',
            INR: '₹',
            GBX: 'p' // pence symbol
        };
        return symbols[currency] || currency;
    }

    getCurrencyName(currency) {
        const names = {
            USD: 'US Dollar',
            EUR: 'Euro',
            GBP: 'British Pound',
            INR: 'Indian Rupee',
            GBX: 'British Pence'
        };
        return names[currency] || currency;
    }

    formatCurrency(amount, currency = 'USD', locale = 'en-US') {
        const currencySymbols = {
            USD: 'USD',
            EUR: 'EUR',
            GBP: 'GBP',
            INR: 'INR',
            GBX: 'GBP' // Format GBX as GBP but with different symbol
        };

        const options = {
            style: 'currency',
            currency: currencySymbols[currency] || currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        };

        // Special handling for GBX (pence)
        if (currency === 'GBX') {
            return `${Math.round(amount)}p`;
        }

        return new Intl.NumberFormat(locale, options).format(amount || 0);
    }

    // Get all supported currencies
    getSupportedCurrencies() {
        return [
            { code: 'USD', name: 'US Dollar', symbol: '$' },
            { code: 'EUR', name: 'Euro', symbol: '€' },
            { code: 'GBP', name: 'British Pound', symbol: '£' },
            { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
            { code: 'GBX', name: 'British Pence', symbol: 'p' }
        ];
    }
}

module.exports = new CurrencyService();
