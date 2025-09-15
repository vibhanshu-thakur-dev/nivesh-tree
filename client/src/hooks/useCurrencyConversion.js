import { useState, useEffect, useCallback } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';

export const useCurrencyConversion = () => {
    const { convertAmount, selectedCurrency } = useCurrency();
    const [convertedData, setConvertedData] = useState({});

    const convertInvestmentValue = useCallback(async (value, fromCurrency, toCurrency = selectedCurrency) => {
        if (!value || value === 0) return 0;
        if (fromCurrency === toCurrency) return value;
        
        try {
            return await convertAmount(value, fromCurrency, toCurrency);
        } catch (error) {
            console.error('Error converting investment value:', error);
            return value; // Return original value as fallback
        }
    }, [convertAmount, selectedCurrency]);

    const convertInvestment = useCallback(async (investment) => {
        if (!investment) return investment;
        
        const originalCurrency = investment.currency || 'USD';
        
        if (originalCurrency === selectedCurrency) {
            return investment;
        }

        try {
            const convertedInvestment = { ...investment };
            
            // Convert all monetary values
            if (investment.averagePrice) {
                convertedInvestment.averagePrice = await convertInvestmentValue(
                    investment.averagePrice, 
                    originalCurrency, 
                    selectedCurrency
                );
            }
            
            if (investment.currentPrice) {
                convertedInvestment.currentPrice = await convertInvestmentValue(
                    investment.currentPrice, 
                    originalCurrency, 
                    selectedCurrency
                );
            }
            
            if (investment.totalValue) {
                convertedInvestment.totalValue = await convertInvestmentValue(
                    investment.totalValue, 
                    originalCurrency, 
                    selectedCurrency
                );
            }

            // Update currency field
            convertedInvestment.currency = selectedCurrency;
            
            return convertedInvestment;
        } catch (error) {
            console.error('Error converting investment:', error);
            return investment; // Return original investment as fallback
        }
    }, [convertInvestmentValue, selectedCurrency]);

    const convertInvestments = useCallback(async (investments) => {
        if (!investments || !Array.isArray(investments)) return investments;
        
        try {
            const convertedInvestments = await Promise.all(
                investments.map(investment => convertInvestment(investment))
            );
            return convertedInvestments;
        } catch (error) {
            console.error('Error converting investments:', error);
            return investments; // Return original investments as fallback
        }
    }, [convertInvestment]);

    const calculateInvestmentMetrics = useCallback(async (investment) => {
        if (!investment) return { currentValue: 0, investedValue: 0, gainLoss: 0, gainLossPercentage: 0 };
        
        const originalCurrency = investment.currency || 'USD';
        
        // Convert values to selected currency
        const currentValue = await convertInvestmentValue(
            investment.totalValue || (investment.quantity * investment.currentPrice), 
            originalCurrency, 
            selectedCurrency
        );
        
        const investedValue = await convertInvestmentValue(
            investment.quantity * investment.averagePrice, 
            originalCurrency, 
            selectedCurrency
        );
        
        const gainLoss = currentValue - investedValue;
        const gainLossPercentage = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;
        
        return {
            currentValue,
            investedValue,
            gainLoss,
            gainLossPercentage
        };
    }, [convertInvestmentValue, selectedCurrency]);

    const convertPortfolioData = useCallback(async (portfolioData) => {
        if (!portfolioData) return portfolioData;
        
        try {
            const convertedData = { ...portfolioData };
            
            // Convert main totals - these are now in GBP from the server
            const sourceCurrency = 'GBP';
            
            // Convert main totals
            if (portfolioData.totalValue) {
                convertedData.totalValue = await convertInvestmentValue(
                    portfolioData.totalValue, 
                    sourceCurrency,
                    selectedCurrency
                );
            }
            
            if (portfolioData.totalInvested) {
                convertedData.totalInvested = await convertInvestmentValue(
                    portfolioData.totalInvested, 
                    sourceCurrency, 
                    selectedCurrency
                );
            }
            
            if (portfolioData.totalGainLoss) {
                convertedData.totalGainLoss = await convertInvestmentValue(
                    portfolioData.totalGainLoss, 
                    sourceCurrency, 
                    selectedCurrency
                );
            }
            
            // Convert member data - these are also in GBP from the server
            if (portfolioData.members && Array.isArray(portfolioData.members)) {
                convertedData.members = await Promise.all(
                    portfolioData.members.map(async (member) => {
                        const convertedMember = { ...member };
                        
                        if (member.totalValue) {
                            convertedMember.totalValue = await convertInvestmentValue(
                                member.totalValue, 
                                sourceCurrency, 
                                selectedCurrency
                            );
                        }
                        
                        if (member.totalInvested) {
                            convertedMember.totalInvested = await convertInvestmentValue(
                                member.totalInvested, 
                                sourceCurrency, 
                                selectedCurrency
                            );
                        }
                        
                        if (member.totalGainLoss) {
                            convertedMember.totalGainLoss = await convertInvestmentValue(
                                member.totalGainLoss, 
                                sourceCurrency, 
                                selectedCurrency
                            );
                        }
                        
                        // Convert member investments - these are in their original currencies
                        if (member.investments && Array.isArray(member.investments)) {
                            convertedMember.investments = await convertInvestments(member.investments);
                        }
                        
                        return convertedMember;
                    })
                );
            }
            
            // Convert all investments - these are in their original currencies
            if (portfolioData.allInvestments && Array.isArray(portfolioData.allInvestments)) {
                convertedData.allInvestments = await convertInvestments(portfolioData.allInvestments);
            }
            
            // Convert investments array if it exists
            if (portfolioData.investments && Array.isArray(portfolioData.investments)) {
                convertedData.investments = await convertInvestments(portfolioData.investments);
            }
            
            return convertedData;
        } catch (error) {
            console.error('Error converting portfolio data:', error);
            return portfolioData; // Return original data as fallback
        }
    }, [convertInvestmentValue, convertInvestments, selectedCurrency]);

    return {
        convertInvestment,
        convertInvestments,
        convertInvestmentValue,
        calculateInvestmentMetrics,
        convertPortfolioData,
        selectedCurrency
    };
};
