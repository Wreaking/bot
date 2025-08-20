
const { EmbedBuilder } = require('discord.js');

class SafetyWrapper {
    constructor() {
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.circuitBreakers = new Map();
        this.metrics = {
            operationsWrapped: 0,
            operationsSucceeded: 0,
            operationsFailed: 0,
            operationsRetried: 0
        };
    }

    /**
     * Wrap a function with safety mechanisms
     * @param {Function} operation - Function to wrap
     * @param {Object} options - Safety options
     * @returns {Function} - Wrapped function
     */
    wrap(operation, options = {}) {
        const {
            maxRetries = this.maxRetries,
            retryDelay = this.retryDelay,
            timeout = 30000, // 30 seconds
            fallback = null,
            circuitBreaker = false,
            context = 'unknown'
        } = options;

        return async (...args) => {
            this.metrics.operationsWrapped++;

            // Check circuit breaker
            if (circuitBreaker && this.isCircuitOpen(context)) {
                console.warn(`Circuit breaker open for ${context}`);
                if (fallback) {
                    return await this.executeFallback(fallback, args);
                }
                throw new Error(`Circuit breaker open for ${context}`);
            }

            let lastError;
            let attempts = 0;

            while (attempts <= maxRetries) {
                try {
                    // Wrap with timeout
                    const result = await this.withTimeout(operation(...args), timeout);
                    
                    this.metrics.operationsSucceeded++;
                    
                    // Reset circuit breaker on success
                    if (circuitBreaker) {
                        this.resetCircuitBreaker(context);
                    }
                    
                    return result;

                } catch (error) {
                    lastError = error;
                    attempts++;

                    // Log error with context
                    console.error(`Operation failed (attempt ${attempts}/${maxRetries + 1}) in ${context}:`, error.message);

                    // Don't retry on certain errors
                    if (this.shouldNotRetry(error)) {
                        break;
                    }

                    // Wait before retry
                    if (attempts <= maxRetries) {
                        this.metrics.operationsRetried++;
                        await this.delay(retryDelay * attempts); // Exponential backoff
                    }
                }
            }

            // All retries failed
            this.metrics.operationsFailed++;

            // Update circuit breaker
            if (circuitBreaker) {
                this.recordFailure(context);
            }

            // Try fallback
            if (fallback) {
                try {
                    console.log(`Executing fallback for ${context}`);
                    return await this.executeFallback(fallback, args);
                } catch (fallbackError) {
                    console.error(`Fallback failed for ${context}:`, fallbackError);
                }
            }

            throw lastError;
        };
    }

    /**
     * Wrap database operations with special handling
     * @param {Function} operation - Database operation
     * @param {Object} options - Options
     * @returns {Function} - Wrapped function
     */
    wrapDatabase(operation, options = {}) {
        return this.wrap(operation, {
            maxRetries: 2,
            retryDelay: 2000,
            timeout: 10000,
            circuitBreaker: true,
            context: 'database',
            fallback: () => {
                console.warn('Database operation failed, returning default data');
                return this.getDefaultDatabaseResponse(options.defaultResponse);
            },
            ...options
        });
    }

    /**
     * Wrap API calls with special handling
     * @param {Function} operation - API operation
     * @param {Object} options - Options
     * @returns {Function} - Wrapped function
     */
    wrapAPI(operation, options = {}) {
        return this.wrap(operation, {
            maxRetries: 3,
            retryDelay: 1000,
            timeout: 15000,
            circuitBreaker: true,
            context: `api_${options.service || 'unknown'}`,
            ...options
        });
    }

    /**
     * Wrap Discord API operations
     * @param {Function} operation - Discord operation
     * @param {Object} options - Options
     * @returns {Function} - Wrapped function
     */
    wrapDiscord(operation, options = {}) {
        return this.wrap(operation, {
            maxRetries: 2,
            retryDelay: 1500,
            timeout: 20000,
            context: 'discord_api',
            fallback: async (interaction) => {
                if (interaction && interaction.isRepliable()) {
                    try {
                        await this.sendFallbackMessage(interaction);
                    } catch (error) {
                        console.error('Failed to send fallback message:', error);
                    }
                }
            },
            ...options
        });
    }

    /**
     * Execute operation with timeout
     * @param {Promise} promise - Promise to timeout
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise} - Promise that resolves or times out
     */
    withTimeout(promise, timeout) {
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Operation timed out after ${timeout}ms`));
                }, timeout);
            })
        ]);
    }

    /**
     * Check if error should not be retried
     * @param {Error} error - Error to check
     * @returns {boolean} - Whether to skip retry
     */
    shouldNotRetry(error) {
        const message = error.message.toLowerCase();
        const code = error.code;

        // Don't retry permission errors
        if (code === 'MISSING_PERMISSIONS' || message.includes('forbidden')) {
            return true;
        }

        // Don't retry validation errors
        if (message.includes('validation') || message.includes('invalid')) {
            return true;
        }

        // Don't retry rate limit errors (they have their own handling)
        if (code === 'RATE_LIMITED') {
            return true;
        }

        // Don't retry certain HTTP errors
        if (error.status && [400, 401, 403, 404].includes(error.status)) {
            return true;
        }

        return false;
    }

    /**
     * Circuit breaker implementation
     */
    isCircuitOpen(context) {
        const breaker = this.circuitBreakers.get(context);
        if (!breaker) return false;

        const now = Date.now();
        
        // If in open state, check if enough time has passed
        if (breaker.state === 'open') {
            if (now - breaker.lastFailureTime > breaker.timeout) {
                breaker.state = 'half-open';
                return false;
            }
            return true;
        }

        return false;
    }

    recordFailure(context) {
        let breaker = this.circuitBreakers.get(context);
        
        if (!breaker) {
            breaker = {
                failures: 0,
                threshold: 5,
                timeout: 60000, // 1 minute
                state: 'closed',
                lastFailureTime: Date.now()
            };
            this.circuitBreakers.set(context, breaker);
        }

        breaker.failures++;
        breaker.lastFailureTime = Date.now();

        // Open circuit if threshold exceeded
        if (breaker.failures >= breaker.threshold) {
            breaker.state = 'open';
            console.warn(`Circuit breaker opened for ${context} after ${breaker.failures} failures`);
        }
    }

    resetCircuitBreaker(context) {
        const breaker = this.circuitBreakers.get(context);
        if (breaker) {
            breaker.failures = 0;
            breaker.state = 'closed';
        }
    }

    /**
     * Execute fallback function safely
     * @param {Function} fallback - Fallback function
     * @param {Array} args - Arguments to pass
     * @returns {Promise} - Fallback result
     */
    async executeFallback(fallback, args) {
        try {
            if (typeof fallback === 'function') {
                return await fallback(...args);
            } else {
                return fallback;
            }
        } catch (error) {
            console.error('Fallback execution failed:', error);
            throw error;
        }
    }

    /**
     * Get default database response
     * @param {any} defaultResponse - Default response
     * @returns {any} - Default response
     */
    getDefaultDatabaseResponse(defaultResponse) {
        if (defaultResponse !== undefined) {
            return defaultResponse;
        }

        // Generic default response
        return {
            id: 'default',
            coins: 0,
            level: 1,
            inventory: { items: [] },
            skills: {},
            statistics: {}
        };
    }

    /**
     * Send fallback message to user
     * @param {Interaction} interaction - Discord interaction
     */
    async sendFallbackMessage(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚠️ Service Temporarily Unavailable')
            .setDescription('We\'re experiencing technical difficulties. Please try again in a moment.')
            .addFields([
                { name: 'What happened?', value: 'A backend service is temporarily unavailable.', inline: false },
                { name: 'What can you do?', value: 'Wait a moment and try again. This usually resolves quickly.', inline: false }
            ])
            .setFooter({ text: 'We apologize for the inconvenience.' })
            .setTimestamp();

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else if (interaction.deferred && !interaction.replied) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.followUp({ embeds: [embed], ephemeral: true });
        }
    }

    /**
     * Create a delay
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} - Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Batch operations with safety
     * @param {Array} operations - Array of operations
     * @param {Object} options - Batch options
     * @returns {Promise<Array>} - Results array
     */
    async batch(operations, options = {}) {
        const {
            concurrency = 5,
            continueOnError = true,
            timeout = 30000
        } = options;

        const results = [];
        const errors = [];

        // Process in batches
        for (let i = 0; i < operations.length; i += concurrency) {
            const batch = operations.slice(i, i + concurrency);
            
            const batchPromises = batch.map(async (operation, index) => {
                try {
                    const result = await this.withTimeout(operation(), timeout);
                    return { index: i + index, result, error: null };
                } catch (error) {
                    const errorInfo = { index: i + index, result: null, error };
                    if (!continueOnError) {
                        throw error;
                    }
                    return errorInfo;
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);
            
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    const { index, result: opResult, error } = result.value;
                    results[index] = opResult;
                    if (error) {
                        errors[index] = error;
                    }
                } else {
                    // Promise was rejected
                    if (!continueOnError) {
                        throw result.reason;
                    }
                    errors.push(result.reason);
                }
            }
        }

        return {
            results,
            errors: errors.filter(Boolean),
            successCount: results.filter(Boolean).length,
            errorCount: errors.filter(Boolean).length
        };
    }

    /**
     * Get safety metrics
     * @returns {Object} - Metrics object
     */
    getMetrics() {
        return {
            ...this.metrics,
            circuitBreakers: this.circuitBreakers.size,
            successRate: this.metrics.operationsWrapped > 0 
                ? this.metrics.operationsSucceeded / this.metrics.operationsWrapped 
                : 0
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            operationsWrapped: 0,
            operationsSucceeded: 0,
            operationsFailed: 0,
            operationsRetried: 0
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.retryAttempts.clear();
        this.circuitBreakers.clear();
        this.resetMetrics();
    }
}

// Create singleton instance
const safetyWrapper = new SafetyWrapper();

module.exports = {
    SafetyWrapper,
    wrap: safetyWrapper.wrap.bind(safetyWrapper),
    wrapDatabase: safetyWrapper.wrapDatabase.bind(safetyWrapper),
    wrapAPI: safetyWrapper.wrapAPI.bind(safetyWrapper),
    wrapDiscord: safetyWrapper.wrapDiscord.bind(safetyWrapper),
    batch: safetyWrapper.batch.bind(safetyWrapper),
    getMetrics: safetyWrapper.getMetrics.bind(safetyWrapper),
    resetMetrics: safetyWrapper.resetMetrics.bind(safetyWrapper),
    cleanup: safetyWrapper.cleanup.bind(safetyWrapper)
};
