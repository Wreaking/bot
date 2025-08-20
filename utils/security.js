const path = require('path');
const config = require('../config.js');

class SecurityManager {
    constructor() {
        this.userCooldowns = new Map();
        this.commandUsage = new Map();
        this.suspiciousActivity = new Map();
        
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 30 * 60 * 1000); // 30 minutes
    }

    /**
     * Enhanced cooldown checking with user tracking
     */
    isOnCooldown(userId, commandName = 'default') {
        if (!userId || typeof userId !== 'string') {
            return { valid: false, reason: 'Invalid user ID' };
        }
        
        const now = Date.now();
        const cooldownKey = `${userId}-${commandName}`;
        const lastUsed = this.userCooldowns.get(cooldownKey);
        
        // Track command usage
        this.trackCommandUsage(userId, commandName);
        
        if (!lastUsed) {
            this.userCooldowns.set(cooldownKey, now);
            return false;
        }
        
        const cooldownTime = config.commandCooldown || 3000; // fallback to 3 seconds
        const timeLeft = (lastUsed + cooldownTime) - now;
        
        if (timeLeft > 0) {
            return timeLeft;
        }
        
        this.userCooldowns.set(cooldownKey, now);
        return false;
    }

    /**
     * Track command usage for analytics and rate limiting
     */
    trackCommandUsage(userId, commandName) {
        if (!userId || !commandName) return;
        
        const key = `${userId}-${commandName}`;
        const usage = this.commandUsage.get(key) || { count: 0, lastUsed: 0, firstUsed: Date.now() };
        
        usage.count++;
        usage.lastUsed = Date.now();
        
        this.commandUsage.set(key, usage);
        
        // Clean up old usage data (older than 1 hour)
        if (usage.count > 50 && (Date.now() - usage.firstUsed) < 3600000) {
            this.flagSuspiciousActivity(userId, 'high_frequency_commands');
        }
    }

    /**
     * Flag suspicious activity for monitoring
     */
    flagSuspiciousActivity(userId, reason) {
        if (!userId || !reason) return;
        
        const activity = this.suspiciousActivity.get(userId) || [];
        activity.push({ reason, timestamp: Date.now() });
        
        // Keep only last 10 activities
        if (activity.length > 10) {
            activity.shift();
        }
        
        this.suspiciousActivity.set(userId, activity);
    }

    /**
     * Enhanced path sanitization for Discord display
     */
    sanitizePath(filePath) {
        if (!filePath || typeof filePath !== 'string') return '';
        
        // Remove potentially harmful characters for Discord display
        let sanitized = filePath.replace(/[`]/g, '\\`');
        
        // Escape Discord markdown
        sanitized = sanitized.replace(/[*_~|]/g, '\\$&');
        
        // Limit length to prevent spam
        if (sanitized.length > 100) {
            sanitized = sanitized.substring(0, 97) + '...';
        }
        
        return sanitized;
    }

    /**
     * Enhanced content validation for Discord compatibility
     */
    validateContentForDiscord(content) {
        if (!content || typeof content !== 'string') {
            return { valid: true };
        }

        const maxFileSize = 2000; // Discord message limit, fallback since config doesn't have maxFileSize

        // Check if content is too long for Discord
        if (content.length > maxFileSize) {
            return {
                valid: false,
                reason: `File content too long (${content.length.toLocaleString()} characters, max: ${maxFileSize.toLocaleString()})`
            };
        }

        // Check for potentially problematic content patterns
        const warnings = [];
        
        // Discord invite links
        const invitePattern = /discord\.gg\/\w+/gi;
        if (invitePattern.test(content)) {
            warnings.push('Content contains Discord invite links');
        }

        // Suspicious URLs (basic check)
        const urlPattern = /https?:\/\/[^\s]+/gi;
        const urls = content.match(urlPattern);
        if (urls && urls.length > 5) {
            warnings.push(`Content contains ${urls.length} URLs`);
        }

        // Check for very long lines that might break Discord formatting
        const lines = content.split('\n');
        const longLines = lines.filter(line => line.length > 2000);
        if (longLines.length > 0) {
            warnings.push(`${longLines.length} lines exceed 2000 characters`);
        }

        // Check for excessive special characters (prevent division by zero)
        if (content.length > 0) {
            const specialCharCount = (content.match(/[^\w\s\n\r\t]/g) || []).length;
            const specialCharRatio = specialCharCount / content.length;
            if (specialCharRatio > 0.3) {
                warnings.push('High ratio of special characters detected');
            }
        }

        return { 
            valid: true, 
            warnings: warnings.length > 0 ? warnings : null 
        };
    }

    /**
     * Enhanced file size formatting with color coding
     */
    formatFileSize(bytes) {
        if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
            return '0 Bytes';
        }
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Bytes';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const size = Math.round(bytes / Math.pow(1024, i) * 100) / 100;
        
        return `${size} ${sizes[i]}`;
    }

    /**
     * Get file size category for UI styling
     */
    getFileSizeCategory(bytes) {
        if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
            return 'tiny';
        }
        
        if (bytes < 1024) return 'tiny';           // < 1KB
        if (bytes < 10240) return 'small';         // < 10KB  
        if (bytes < 102400) return 'medium';       // < 100KB
        if (bytes < 1048576) return 'large';       // < 1MB
        return 'huge';                             // >= 1MB
    }

    /**
     * Truncate content with intelligent line breaking
     */
    truncateContent(content, maxLength = 2000) {
        if (!content || typeof content !== 'string') {
            return '';
        }
        
        if (content.length <= maxLength) {
            return content;
        }
        
        // Try to break at a line boundary near the limit
        const lines = content.split('\n');
        let truncated = '';
        
        for (const line of lines) {
            if ((truncated + line + '\n').length > maxLength - 10) {
                break;
            }
            truncated += line + '\n';
        }
        
        // If no good line break found, just cut at character limit
        if (truncated.length < maxLength / 2) {
            truncated = content.substring(0, maxLength - 3);
        }
        
        return truncated.trim() + '\n...';
    }

    /**
     * Validate file path for security
     */
    validateFilePath(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            return { valid: false, reason: 'File path is required and must be a string' };
        }

        // Check for path traversal attempts
        if (filePath.includes('../') || filePath.includes('..\\')) {
            return { valid: false, reason: 'Path traversal not allowed' };
        }

        // Check for absolute paths (should be relative)
        if (path.isAbsolute(filePath)) {
            return { valid: false, reason: 'Absolute paths not allowed' };
        }

        // Check for null bytes
        if (filePath.includes('\0')) {
            return { valid: false, reason: 'Null bytes in path not allowed' };
        }

        // Check for excessively long paths
        if (filePath.length > 260) {
            return { valid: false, reason: 'Path too long (max 260 characters)' };
        }

        // Check for restricted characters
        const restrictedChars = /[<>:"|?*]/;
        if (restrictedChars.test(filePath)) {
            return { valid: false, reason: 'Path contains restricted characters' };
        }

        return { valid: true };
    }

    /**
     * Clean up expired data to prevent memory leaks
     */
    cleanup() {
        const now = Date.now();
        const oneHour = 3600000;
        
        // Clean up cooldowns older than 1 hour
        for (const [key, timestamp] of this.userCooldowns.entries()) {
            if (now - timestamp > oneHour) {
                this.userCooldowns.delete(key);
            }
        }
        
        // Clean up old command usage data
        for (const [key, usage] of this.commandUsage.entries()) {
            if (now - usage.lastUsed > oneHour) {
                this.commandUsage.delete(key);
            }
        }
        
        // Clean up old suspicious activity flags
        for (const [userId, activities] of this.suspiciousActivity.entries()) {
            const recentActivities = activities.filter(activity => 
                now - activity.timestamp < oneHour
            );
            
            if (recentActivities.length === 0) {
                this.suspiciousActivity.delete(userId);
            } else {
                this.suspiciousActivity.set(userId, recentActivities);
            }
        }
    }

    /**
     * Get user statistics
     */
    getUserStats(userId) {
        if (!userId || typeof userId !== 'string') {
            return {
                commands: {},
                suspiciousActivities: [],
                totalCommands: 0
            };
        }
        
        const userCommands = Array.from(this.commandUsage.entries())
            .filter(([key]) => key.startsWith(userId))
            .reduce((acc, [key, usage]) => {
                const commandParts = key.split('-');
                commandParts.shift(); // Remove userId part
                const command = commandParts.join('-'); // Rejoin in case command had dashes
                acc[command] = usage;
                return acc;
            }, {});

        const suspicious = this.suspiciousActivity.get(userId) || [];

        return {
            commands: userCommands,
            suspiciousActivities: suspicious,
            totalCommands: Object.values(userCommands).reduce((sum, usage) => sum + usage.count, 0)
        };
    }

    /**
     * Enhanced error message formatting
     */
    formatErrorMessage(error, context = {}) {
        let message = (error && error.message) ? error.message : 'Unknown error occurred';
        
        // Add context if available
        if (context.filePath) {
            message = `${message}\nFile: ${this.sanitizePath(context.filePath)}`;
        }
        
        if (context.command) {
            message = `${message}\nCommand: ${context.command}`;
        }
        
        // Sanitize the message
        message = message.replace(/[`]/g, '\\`');
        
        return message;
    }

    /**
     * Generate security report
     */
    getSecurityReport() {
        return {
            activeCooldowns: this.userCooldowns.size,
            trackedUsers: this.commandUsage.size,
            suspiciousUsers: this.suspiciousActivity.size,
            totalSuspiciousActivities: Array.from(this.suspiciousActivity.values())
                .reduce((sum, activities) => sum + activities.length, 0),
            config: {
                cooldownMs: config.commandCooldown || 3000,
                maxFileSize: 2000, // Discord message limit fallback
                version: config.version || 'unknown',
                features: config.features || {}
            }
        };
    }

    /**
     * Destroy the security manager and clean up resources
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        this.userCooldowns.clear();
        this.commandUsage.clear();
        this.suspiciousActivity.clear();
    }
}

module.exports = SecurityManager;