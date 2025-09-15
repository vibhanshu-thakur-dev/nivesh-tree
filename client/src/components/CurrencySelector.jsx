import React, { useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

const CurrencySelector = ({ className = '' }) => {
    const { 
        selectedCurrency, 
        supportedCurrencies, 
        changeCurrency, 
        loading,
        getCurrencySymbol,
        getCurrencyName 
    } = useCurrency();
    
    const [isOpen, setIsOpen] = useState(false);

    const handleCurrencyChange = async (currencyCode) => {
        await changeCurrency(currencyCode);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={loading}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
                <Globe className="h-4 w-4" />
                <span>{getCurrencySymbol(selectedCurrency)}</span>
                <span className="hidden sm:inline">{selectedCurrency}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Dropdown */}
                    <div className="absolute right-0 z-20 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                        <div className="py-1">
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
                                Select Currency
                            </div>
                            {supportedCurrencies.map((currency) => (
                                <button
                                    key={currency.code}
                                    onClick={() => handleCurrencyChange(currency.code)}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center justify-between ${
                                        selectedCurrency === currency.code 
                                            ? 'bg-primary-50 text-primary-700' 
                                            : 'text-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="text-lg">{currency.symbol}</span>
                                        <div>
                                            <div className="font-medium">{currency.code}</div>
                                            <div className="text-xs text-gray-500">{currency.name}</div>
                                        </div>
                                    </div>
                                    {selectedCurrency === currency.code && (
                                        <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CurrencySelector;
