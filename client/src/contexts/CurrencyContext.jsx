import React, { createContext, useContext, useState, useEffect } from 'react';
import { currencyAPI } from '../services/api';

const CurrencyContext = createContext();

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};

export const CurrencyProvider = ({ children }) => {
    const [selectedCurrency, setSelectedCurrency] = useState('GBP');
    const [supportedCurrencies, setSupportedCurrencies] = useState([]);
    const [exchangeRates, setExchangeRates] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load supported currencies on mount
    useEffect(() => {
        loadSupportedCurrencies();
        loadExchangeRates();
    }, []);

    const loadSupportedCurrencies = async () => {
        try {
            const response = await currencyAPI.getSupportedCurrencies();
            setSupportedCurrencies(response.data.currencies);
        } catch (error) {
            console.error('Error loading supported currencies:', error);
            setError('Failed to load supported currencies');
        }
    };

    const loadExchangeRates = async () => {
        try {
            const response = await currencyAPI.getExchangeRates();
            setExchangeRates(response.data.rates);
        } catch (error) {
            console.error('Error loading exchange rates:', error);
            setError('Failed to load exchange rates');
        }
    };

    const convertAmount = async (amount, fromCurrency, toCurrency) => {
        if (!amount || amount === 0) return 0;
        if (fromCurrency === toCurrency) return amount;

        try {
            const response = await currencyAPI.convertAmount(amount, fromCurrency, toCurrency);
            return response.data.convertedAmount;
        } catch (error) {
            console.error('Error converting amount:', error);
            return amount; // Return original amount as fallback
        }
    };

    const convertPortfolioData = async (portfolioData, targetCurrency) => {
        if (!portfolioData) return portfolioData;

        try {
            const response = await currencyAPI.convertPortfolioData(portfolioData, targetCurrency);
            return response.data.convertedData;
        } catch (error) {
            console.error('Error converting portfolio data:', error);
            return portfolioData; // Return original data as fallback
        }
    };

    const formatCurrency = (amount, currency = selectedCurrency) => {
        if (!amount && amount !== 0) return 'N/A';
        
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

        return new Intl.NumberFormat('en-GB', options).format(amount);
    };

    const getCurrencySymbol = (currency = selectedCurrency) => {
        const symbols = {
            USD: '$',
            EUR: '€',
            GBP: '£',
            INR: '₹',
            GBX: 'p'
        };
        return symbols[currency] || currency;
    };

    const getCurrencyName = (currency = selectedCurrency) => {
        const names = {
            USD: 'US Dollar',
            EUR: 'Euro',
            GBP: 'British Pound',
            INR: 'Indian Rupee',
            GBX: 'British Pence'
        };
        return names[currency] || currency;
    };

    const changeCurrency = async (newCurrency) => {
        setLoading(true);
        setError(null);
        
        try {
            setSelectedCurrency(newCurrency);
            // Store in localStorage for persistence
            localStorage.setItem('selectedCurrency', newCurrency);
        } catch (error) {
            console.error('Error changing currency:', error);
            setError('Failed to change currency');
        } finally {
            setLoading(false);
        }
    };

    // Load saved currency preference on mount
    useEffect(() => {
        const savedCurrency = localStorage.getItem('selectedCurrency');
        if (savedCurrency && supportedCurrencies.some(c => c.code === savedCurrency)) {
            setSelectedCurrency(savedCurrency);
        }
    }, [supportedCurrencies]);

    const value = {
        selectedCurrency,
        supportedCurrencies,
        exchangeRates,
        loading,
        error,
        convertAmount,
        convertPortfolioData,
        formatCurrency,
        getCurrencySymbol,
        getCurrencyName,
        changeCurrency,
        loadExchangeRates
    };

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
};
