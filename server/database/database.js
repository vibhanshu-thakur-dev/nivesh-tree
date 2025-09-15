const { connectDB } = require('./mongodb');
const models = require('../models');

class Database {
    constructor() {
        this.models = models;
        this.isConnected = false;
        this.init();
    }

    async init() {
        try {
            await connectDB();
            this.isConnected = true;
            console.log('MongoDB database initialized successfully');
        } catch (error) {
            console.error('Error initializing MongoDB database:', error);
            throw error;
        }
    }

    // Helper method to ensure database is connected
    async ensureConnected() {
        if (!this.isConnected) {
            await this.init();
        }
    }

    // User operations
    async createUser(userData) {
        await this.ensureConnected();
        const user = new this.models.User(userData);
        return await user.save();
    }

    async findUserByEmail(email) {
        await this.ensureConnected();
        return await this.models.User.findOne({ email });
    }

    async findUserByUsername(username) {
        await this.ensureConnected();
        return await this.models.User.findOne({ username });
    }

    async findUserById(id) {
        await this.ensureConnected();
        return await this.models.User.findById(id);
    }

    async updateUser(id, updateData) {
        await this.ensureConnected();
        return await this.models.User.findByIdAndUpdate(id, updateData, { new: true });
    }

    async updateUserApiKeys(userId, apiKeys) {
        await this.ensureConnected();
        return await this.models.User.findByIdAndUpdate(
            userId, 
            { apiKeys }, 
            { new: true }
        );
    }

    async getUserApiKeys(userId) {
        await this.ensureConnected();
        const user = await this.models.User.findById(userId, 'apiKeys');
        return user ? user.apiKeys : null;
    }

    // Household operations
    async createHousehold(householdData) {
        await this.ensureConnected();
        const household = new this.models.Household(householdData);
        return await household.save();
    }

    async findHouseholdById(id) {
        await this.ensureConnected();
        return await this.models.Household.findById(id)
            .populate('members', 'name email role isActive settings profile');
    }

    async findHouseholdByUser(userId) {
        await this.ensureConnected();
        return await this.models.Household.findOne({ createdBy: userId })
            .populate('members', 'name email role isActive settings profile');
    }

    async updateHousehold(id, updateData) {
        await this.ensureConnected();
        return await this.models.Household.findByIdAndUpdate(id, updateData, { new: true });
    }

    // Member operations
    async createMember(memberData) {
        await this.ensureConnected();
        const member = new this.models.Member(memberData);
        return await member.save();
    }

    async findMemberById(id) {
        await this.ensureConnected();
        return await this.models.Member.findById(id);
    }

    async findMembersByHousehold(householdId) {
        await this.ensureConnected();
        return await this.models.Member.find({ householdId, isActive: true });
    }

    async findMembersByHouseholdSafe(householdId) {
        await this.ensureConnected();
        return await this.models.Member.find({ householdId, isActive: true })
            .select('name email role isActive settings profile');
    }

    async findMemberByEmail(email) {
        await this.ensureConnected();
        return await this.models.Member.findOne({ email, isActive: true });
    }

    async updateMember(id, updateData) {
        await this.ensureConnected();
        return await this.models.Member.findByIdAndUpdate(id, updateData, { new: true });
    }

    async updateMemberApiKeys(memberId, apiKeys) {
        await this.ensureConnected();
        return await this.models.Member.findByIdAndUpdate(
            memberId, 
            { apiKeys }, 
            { new: true }
        );
    }

    async getMemberApiKeys(memberId) {
        await this.ensureConnected();
        const member = await this.models.Member.findById(memberId, 'apiKeys');
        return member ? member.apiKeys : null;
    }

    async deleteUser(id) {
        await this.ensureConnected();
        return await this.models.User.findByIdAndDelete(id);
    }

    // Investment Account operations
    async createInvestmentAccount(accountData) {
        await this.ensureConnected();
        const account = new this.models.InvestmentAccount(accountData);
        return await account.save();
    }

    async findInvestmentAccountById(id) {
        await this.ensureConnected();
        return await this.models.InvestmentAccount.findById(id);
    }

    async findInvestmentAccountsByUser(userId) {
        await this.ensureConnected();
        return await this.models.InvestmentAccount.find({ userId });
    }

    async findInvestmentAccountsByHousehold(householdId) {
        await this.ensureConnected();
        return await this.models.InvestmentAccount.find({ householdId })
            .populate('memberId', 'name email role isActive settings profile');
    }

    async findInvestmentAccountsByMember(memberId) {
        await this.ensureConnected();
        return await this.models.InvestmentAccount.find({ memberId });
    }

    async updateInvestmentAccount(id, updateData) {
        await this.ensureConnected();
        return await this.models.InvestmentAccount.findByIdAndUpdate(id, updateData, { new: true });
    }

    async deleteInvestmentAccount(id) {
        await this.ensureConnected();
        return await this.models.InvestmentAccount.findByIdAndDelete(id);
    }

    // Investment operations
    async createInvestment(investmentData) {
        await this.ensureConnected();
        const investment = new this.models.Investment(investmentData);
        return await investment.save();
    }

    async findInvestmentById(id) {
        await this.ensureConnected();
        return await this.models.Investment.findById(id);
    }

    async findInvestmentsByUser(userId, filters = {}) {
        await this.ensureConnected();
        const query = { userId, ...filters };
        return await this.models.Investment.find(query).sort({ createdAt: -1 });
    }

    async findInvestmentsByHousehold(householdId, filters = {}) {
        await this.ensureConnected();
        const query = { householdId, ...filters };
        return await this.models.Investment.find(query)
            .populate('memberId', 'name email role isActive settings profile')
            .sort({ createdAt: -1 });
    }

    async findInvestmentsByMember(memberId, filters = {}) {
        await this.ensureConnected();
        const query = { memberId, ...filters };
        return await this.models.Investment.find(query).populate('accountId').sort({ createdAt: -1 });
    }

    async findInvestmentByUserAndSymbol(userId, symbol, investmentType) {
        await this.ensureConnected();
        return await this.models.Investment.findOne({ userId, symbol, investmentType });
    }

    async findInvestmentByMemberAndSymbol(memberId, symbol, investmentType) {
        await this.ensureConnected();
        return await this.models.Investment.findOne({ memberId, symbol, investmentType });
    }

    async updateInvestment(id, updateData) {
        await this.ensureConnected();
        return await this.models.Investment.findByIdAndUpdate(id, updateData, { new: true });
    }

    async deleteInvestment(id) {
        await this.ensureConnected();
        return await this.models.Investment.findByIdAndDelete(id);
    }

    async deleteInvestmentsByUser(userId, filters = {}) {
        await this.ensureConnected();
        const query = { userId, ...filters };
        return await this.models.Investment.deleteMany(query);
    }

    async getInvestmentStats(userId) {
        await this.ensureConnected();
        const mongoose = require('mongoose');
        return await this.models.Investment.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    totalValue: { $sum: '$totalValue' },
                    totalValueGBP: { $sum: '$totalValueGBP' },
                    count: { $sum: 1 },
                    byType: {
                        $push: {
                            type: '$investmentType',
                            value: '$totalValue',
                            valueGBP: '$totalValueGBP'
                        }
                    }
                }
            }
        ]);
    }

    // Trading212 Order operations
    async createTrading212Order(orderData) {
        await this.ensureConnected();
        const order = new this.models.Trading212Order(orderData);
        return await order.save();
    }

    async createTrading212Orders(ordersData) {
        await this.ensureConnected();
        return await this.models.Trading212Order.insertMany(ordersData, { ordered: false });
    }

    async findTrading212OrdersByUser(userId, filters = {}) {
        await this.ensureConnected();
        const query = { userId, ...filters };
        return await this.models.Trading212Order.find(query).sort({ orderTime: -1 });
    }

    async deleteTrading212OrdersByUser(userId) {
        await this.ensureConnected();
        return await this.models.Trading212Order.deleteMany({ userId });
    }

    async getTrading212OrderStats(userId) {
        await this.ensureConnected();
        const mongoose = require('mongoose');
        return await this.models.Trading212Order.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalValue: { $sum: '$filledValue' },
                    byType: {
                        $push: {
                            type: '$orderType',
                            value: '$filledValue'
                        }
                    }
                }
            }
        ]);
    }

    // Goal operations
    async createGoal(goalData) {
        await this.ensureConnected();
        const goal = new this.models.Goal(goalData);
        return await goal.save();
    }

    async findGoalById(id) {
        await this.ensureConnected();
        return await this.models.Goal.findById(id);
    }

    async findGoalsByUser(userId, filters = {}) {
        await this.ensureConnected();
        const query = { userId, ...filters };
        return await this.models.Goal.find(query).sort({ createdAt: -1 });
    }

    async findGoalsByHousehold(householdId, memberId = null, filters = {}) {
        await this.ensureConnected();
        const query = { householdId, ...filters };
        if (memberId) {
            query.memberId = memberId;
        }
        return await this.models.Goal.find(query).sort({ createdAt: -1 });
    }

    async updateGoal(id, updateData) {
        await this.ensureConnected();
        return await this.models.Goal.findByIdAndUpdate(id, updateData, { new: true });
    }

    async deleteGoal(id) {
        await this.ensureConnected();
        return await this.models.Goal.findByIdAndDelete(id);
    }

    async deleteGoalsByUser(userId) {
        await this.ensureConnected();
        return await this.models.Goal.deleteMany({ userId });
    }

    // Portfolio Snapshot operations
    async createPortfolioSnapshot(snapshotData) {
        await this.ensureConnected();
        const snapshot = new this.models.PortfolioSnapshot(snapshotData);
        return await snapshot.save();
    }

    async findPortfolioSnapshotsByUser(userId, limit = 10) {
        await this.ensureConnected();
        return await this.models.PortfolioSnapshot
            .find({ userId })
            .sort({ snapshotDate: -1 })
            .limit(limit);
    }

    async findPortfolioSnapshotsByHousehold(householdId, memberId = null, limit = 10) {
        await this.ensureConnected();
        const query = { householdId };
        if (memberId) {
            query.memberId = memberId;
        }
        return await this.models.PortfolioSnapshot
            .find(query)
            .sort({ snapshotDate: -1 })
            .limit(limit);
    }

    // StockSymbol operations
    async createStockSymbol(stockSymbolData) {
        await this.ensureConnected();
        const stockSymbol = new this.models.StockSymbol(stockSymbolData);
        return await stockSymbol.save();
    }

    async findStockSymbolById(id) {
        await this.ensureConnected();
        return await this.models.StockSymbol.findById(id);
    }

    async findStockSymbolByTicker(ticker) {
        await this.ensureConnected();
        return await this.models.StockSymbol.findOne({ 
            ticker: { $regex: new RegExp(`^${ticker}$`, 'i') }
        });
    }

    async findStockSymbols(filters = {}) {
        await this.ensureConnected();
        const query = { ...filters };
        return await this.models.StockSymbol.find(query).sort({ name: 1 });
    }

    async updateStockSymbol(id, updateData) {
        await this.ensureConnected();
        return await this.models.StockSymbol.findByIdAndUpdate(id, updateData, { new: true });
    }

    async deleteStockSymbol(id) {
        await this.ensureConnected();
        return await this.models.StockSymbol.findByIdAndDelete(id);
    }

    async searchStockSymbols(searchTerm) {
        await this.ensureConnected();
        return await this.models.StockSymbol.find({
            $or: [
                { name: { $regex: searchTerm, $options: 'i' } },
                { shortName: { $regex: searchTerm, $options: 'i' } },
                { ticker: { $regex: searchTerm, $options: 'i' } },
                { isin: { $regex: searchTerm, $options: 'i' } }
            ]
        }).sort({ name: 1 });
    }

    async getStockSymbolStats() {
        await this.ensureConnected();
        return await this.models.StockSymbol.aggregate([
            {
                $group: {
                    _id: null,
                    totalSymbols: { $sum: 1 },
                    byType: {
                        $push: {
                            type: '$type',
                            count: 1
                        }
                    },
                    byCurrency: {
                        $push: {
                            currency: '$currencyCode',
                            count: 1
                        }
                    }
                }
            }
        ]);
    }

    // Generic query method for complex operations
    async query(collection, pipeline) {
        await this.ensureConnected();
        const Model = this.models[collection];
        if (!Model) {
            throw new Error(`Model ${collection} not found`);
        }
        return await Model.aggregate(pipeline);
    }

    // Close database connection
    async close() {
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        this.isConnected = false;
    }
}

module.exports = new Database();