const crypto = require('crypto');

class EncryptionService {
    constructor() {
        // Use a more secure key derivation from environment variable
        this.algorithm = 'aes-256-gcm';
        this.secretKey = this.getSecretKey();
    }

    getSecretKey() {
        const envKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
        if (!envKey) {
            throw new Error('ENCRYPTION_KEY or JWT_SECRET environment variable is required');
        }
        
        // Create a 32-byte key from the environment variable
        return crypto.scryptSync(envKey, 'nivesh-tree-salt', 32);
    }

    generateKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    encrypt(text) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', this.secretKey, iv);
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // Combine iv and encrypted data
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    decrypt(encryptedText) {
        try {
            const parts = encryptedText.split(':');
            if (parts.length !== 2) {
                throw new Error('Invalid encrypted data format');
            }
            
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            
            const decipher = crypto.createDecipheriv('aes-256-cbc', this.secretKey, iv);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    // Helper method to encrypt API keys for storage
    encryptApiKey(apiKey) {
        if (!apiKey) return null;
        return this.encrypt(apiKey);
    }

    // Helper method to decrypt API keys for use
    decryptApiKey(encryptedApiKey) {
        if (!encryptedApiKey) return null;
        return this.decrypt(encryptedApiKey);
    }
}

module.exports = new EncryptionService();
