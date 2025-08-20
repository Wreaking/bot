const fs = require('fs').promises;
const path = require('path');
const config = require('../config.js');

class FileManager {
    constructor() {
        this.baseDir = process.cwd();
        
        // Default configuration with fallbacks
        this.config = {
            restrictedPaths: config.restrictedPaths || [
                'node_modules',
                '.git',
                '.env',
                'package-lock.json',
                'yarn.lock',
                'dist',
                'build',
                '.cache',
                'logs'
            ],
            allowedExtensions: config.allowedExtensions || [
                '.js', '.mjs', '.ts', '.jsx', '.tsx',
                '.html', '.htm', '.css', '.scss', '.sass', '.less',
                '.json', '.xml', '.yml', '.yaml', '.toml', '.ini',
                '.md', '.markdown', '.txt', '.rst', '.adoc',
                '.py', '.java', '.cpp', '.c', '.h', '.cs', '.php',
                '.rb', '.go', '.rs', '.sh', '.bash', '.bat',
                '.sql', '.csv', '.log'
            ],
            maxDirectoriesPerListing: config.maxDirectoriesPerListing || 50,
            maxFilesPerDirectory: config.maxFilesPerDirectory || 100,
            maxFileReadSize: config.maxFileReadSize || 1024 * 1024, // 1MB
            fileBackups: config.features?.fileBackups || false
        };
    }

    /**
     * Normalize and validate file path
     */
    normalizePath(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('Invalid file path provided');
        }

        try {
            // Remove any null bytes
            const cleanPath = filePath.replace(/\0/g, '');
            
            // Normalize the path
            const normalizedPath = path.normalize(cleanPath);
            
            // Resolve to absolute path
            const resolvedPath = path.resolve(this.baseDir, normalizedPath);
            
            // Ensure path is within base directory (prevent path traversal)
            if (!resolvedPath.startsWith(this.baseDir)) {
                throw new Error('Access denied: Path is outside allowed directory');
            }
            
            return resolvedPath;
        } catch (error) {
            throw new Error(`Path normalization failed: ${error.message}`);
        }
    }

    /**
     * Check if path is restricted
     */
    isPathRestricted(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            return true; // Restrict invalid paths
        }

        try {
            const normalizedPath = path.normalize(filePath).toLowerCase();
            
            return this.config.restrictedPaths.some(restricted => {
                const restrictedLower = restricted.toLowerCase();
                return normalizedPath.includes(restrictedLower) || 
                       normalizedPath === restrictedLower ||
                       normalizedPath.startsWith(restrictedLower + '/') ||
                       normalizedPath.startsWith(restrictedLower + '\\') ||
                       normalizedPath.endsWith('/' + restrictedLower) ||
                       normalizedPath.endsWith('\\' + restrictedLower);
            });
        } catch (error) {
            console.error('Error checking restricted path:', error);
            return true; // Restrict on error
        }
    }

    /**
     * Check if file extension is allowed
     */
    isExtensionAllowed(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            return false;
        }

        try {
            const ext = path.extname(filePath).toLowerCase();
            return this.config.allowedExtensions.includes(ext) || ext === '';
        } catch (error) {
            console.error('Error checking file extension:', error);
            return false;
        }
    }

    /**
     * List directory contents with enhanced filtering
     */
    async listDirectory(dirPath = '.') {
        try {
            const fullPath = this.normalizePath(dirPath);
            
            if (this.isPathRestricted(dirPath)) {
                throw new Error('Access denied: Restricted directory');
            }

            // Check if path exists and is accessible
            let stats;
            try {
                stats = await fs.stat(fullPath);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    throw new Error(`Directory not found: ${dirPath}`);
                } else if (error.code === 'EACCES') {
                    throw new Error(`Permission denied: ${dirPath}`);
                }
                throw error;
            }

            if (!stats.isDirectory()) {
                throw new Error('Path is not a directory');
            }

            let items;
            try {
                items = await fs.readdir(fullPath, { withFileTypes: true });
            } catch (error) {
                if (error.code === 'EACCES') {
                    throw new Error(`Permission denied reading directory: ${dirPath}`);
                }
                throw error;
            }
            
            const directories = [];
            const files = [];

            for (const item of items) {
                try {
                    // Skip restricted items
                    if (this.isPathRestricted(item.name)) continue;

                    const itemPath = path.join(dirPath, item.name);
                    
                    if (item.isDirectory()) {
                        directories.push({
                            name: item.name,
                            type: 'directory',
                            path: itemPath
                        });
                    } else if (item.isFile() && this.isExtensionAllowed(item.name)) {
                        try {
                            const filePath = path.join(fullPath, item.name);
                            const fileStats = await fs.stat(filePath);
                            
                            files.push({
                                name: item.name,
                                type: 'file',
                                path: itemPath,
                                size: fileStats.size,
                                modified: fileStats.mtime,
                                extension: path.extname(item.name).toLowerCase(),
                                category: this.getFileCategory(item.name)
                            });
                        } catch (error) {
                            // Skip files that can't be accessed
                            console.warn(`Cannot access file: ${item.name}`, error.message);
                        }
                    }
                } catch (error) {
                    // Skip problematic items
                    console.warn(`Error processing item: ${item.name}`, error.message);
                }
            }

            // Sort and apply limits from config
            const sortedDirectories = directories
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                
            const sortedFiles = files
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

            const limitedDirectories = sortedDirectories.slice(0, this.config.maxDirectoriesPerListing);
            const limitedFiles = sortedFiles.slice(0, this.config.maxFilesPerDirectory);

            return {
                path: dirPath,
                directories: limitedDirectories,
                files: limitedFiles,
                totalDirectories: directories.length,
                totalFiles: files.length,
                truncated: {
                    directories: directories.length > this.config.maxDirectoriesPerListing,
                    files: files.length > this.config.maxFilesPerDirectory
                }
            };
        } catch (error) {
            if (error.message.includes('Access denied') || error.message.includes('Permission denied')) {
                throw error; // Re-throw access errors as-is
            }
            throw new Error(`Failed to list directory: ${error.message}`);
        }
    }

    /**
     * Read file content with enhanced error handling
     */
    async readFile(filePath) {
        try {
            const fullPath = this.normalizePath(filePath);
            
            if (this.isPathRestricted(filePath)) {
                throw new Error('Access denied: Restricted file');
            }

            if (!this.isExtensionAllowed(filePath)) {
                throw new Error('File type not allowed');
            }

            let stats;
            try {
                stats = await fs.stat(fullPath);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    throw new Error(`File not found: ${filePath}`);
                } else if (error.code === 'EACCES') {
                    throw new Error(`Permission denied: ${filePath}`);
                }
                throw error;
            }

            if (!stats.isFile()) {
                if (stats.isDirectory()) {
                    throw new Error('Path is a directory, not a file');
                }
                throw new Error('Path is not a regular file');
            }

            if (stats.size > this.config.maxFileReadSize) {
                throw new Error(`File too large to read (${this.formatFileSize(stats.size)}, max: ${this.formatFileSize(this.config.maxFileReadSize)})`);
            }

            let content;
            try {
                content = await fs.readFile(fullPath, 'utf8');
            } catch (error) {
                if (error.code === 'EACCES') {
                    throw new Error(`Permission denied reading file: ${filePath}`);
                } else if (error.code === 'EISDIR') {
                    throw new Error(`Path is a directory, not a file: ${filePath}`);
                }
                throw error;
            }
            
            return {
                path: filePath,
                content: content,
                size: stats.size,
                modified: stats.mtime,
                created: stats.birthtime,
                extension: path.extname(filePath).toLowerCase(),
                lines: content.split('\n').length,
                characters: content.length,
                category: this.getFileCategory(filePath)
            };
        } catch (error) {
            if (error.message.includes('Access denied') || error.message.includes('Permission denied')) {
                throw error; // Re-throw access errors as-is
            }
            throw new Error(`Failed to read file: ${error.message}`);
        }
    }

    /**
     * Write file content with backup support
     */
    async writeFile(filePath, content, options = {}) {
        try {
            if (!content && content !== '') {
                throw new Error('Content is required for writing file');
            }

            const fullPath = this.normalizePath(filePath);
            
            if (this.isPathRestricted(filePath)) {
                throw new Error('Access denied: Restricted file');
            }

            if (!this.isExtensionAllowed(filePath)) {
                throw new Error('File type not allowed');
            }

            // Create backup if file exists and backup is enabled
            if (options.backup !== false && this.config.fileBackups) {
                try {
                    await fs.access(fullPath);
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const ext = path.extname(filePath);
                    const nameWithoutExt = path.basename(filePath, ext);
                    const dir = path.dirname(fullPath);
                    const backupPath = path.join(dir, `${nameWithoutExt}.backup-${timestamp}${ext}`);
                    
                    const existingContent = await fs.readFile(fullPath, 'utf8');
                    await fs.writeFile(backupPath, existingContent, 'utf8');
                } catch (error) {
                    // File doesn't exist or backup failed, continue without backup
                    console.warn('Backup creation failed or file does not exist:', error.message);
                }
            }

            // Ensure directory exists
            const dir = path.dirname(fullPath);
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw new Error(`Failed to create directory: ${error.message}`);
                }
            }

            // Write the file
            try {
                await fs.writeFile(fullPath, String(content), 'utf8');
            } catch (error) {
                if (error.code === 'EACCES') {
                    throw new Error(`Permission denied writing file: ${filePath}`);
                } else if (error.code === 'ENOSPC') {
                    throw new Error('Insufficient disk space');
                } else if (error.code === 'ENOTDIR') {
                    throw new Error(`Invalid directory path: ${path.dirname(filePath)}`);
                }
                throw error;
            }
            
            const stats = await fs.stat(fullPath);
            
            return {
                path: filePath,
                size: stats.size,
                modified: stats.mtime,
                created: stats.birthtime,
                lines: String(content).split('\n').length,
                characters: String(content).length
            };
        } catch (error) {
            if (error.message.includes('Access denied') || error.message.includes('Permission denied')) {
                throw error; // Re-throw access errors as-is
            }
            throw new Error(`Failed to write file: ${error.message}`);
        }
    }

    /**
     * Create directory with recursive option
     */
    async createDirectory(dirPath, options = {}) {
        try {
            const fullPath = this.normalizePath(dirPath);
            
            if (this.isPathRestricted(dirPath)) {
                throw new Error('Access denied: Restricted directory');
            }

            const recursive = options.recursive !== false;
            
            try {
                await fs.mkdir(fullPath, { recursive });
            } catch (error) {
                if (error.code === 'EEXIST') {
                    throw new Error(`Directory already exists: ${dirPath}`);
                } else if (error.code === 'EACCES') {
                    throw new Error(`Permission denied: ${dirPath}`);
                } else if (error.code === 'ENOTDIR') {
                    throw new Error(`Parent path is not a directory: ${path.dirname(dirPath)}`);
                }
                throw error;
            }
            
            return {
                path: dirPath,
                created: new Date(),
                recursive: recursive
            };
        } catch (error) {
            if (error.message.includes('Access denied') || error.message.includes('Permission denied')) {
                throw error; // Re-throw access errors as-is
            }
            throw new Error(`Failed to create directory: ${error.message}`);
        }
    }

    /**
     * Check if path exists
     */
    async exists(filePath) {
        try {
            const fullPath = this.normalizePath(filePath);
            await fs.access(fullPath);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get detailed file/directory information
     */
    async getInfo(targetPath) {
        try {
            const fullPath = this.normalizePath(targetPath);
            
            let stats;
            try {
                stats = await fs.stat(fullPath);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    throw new Error(`Path not found: ${targetPath}`);
                } else if (error.code === 'EACCES') {
                    throw new Error(`Permission denied: ${targetPath}`);
                }
                throw error;
            }
            
            const info = {
                path: targetPath,
                name: path.basename(targetPath),
                type: stats.isDirectory() ? 'directory' : 'file',
                size: stats.size,
                modified: stats.mtime,
                created: stats.birthtime,
                accessed: stats.atime,
                permissions: stats.mode,
                isReadable: false,
                isWritable: false
            };

            if (info.type === 'file') {
                info.extension = path.extname(targetPath).toLowerCase();
                info.directory = path.dirname(targetPath);
                info.category = this.getFileCategory(targetPath);
            }

            // Check actual permissions safely
            try {
                await fs.access(fullPath, fs.constants.R_OK);
                info.isReadable = true;
            } catch (error) {
                // File is not readable
            }

            try {
                await fs.access(fullPath, fs.constants.W_OK);
                info.isWritable = true;
            } catch (error) {
                // File is not writable
            }

            return info;
        } catch (error) {
            if (error.message.includes('Permission denied') || error.message.includes('Path not found')) {
                throw error; // Re-throw specific errors as-is
            }
            throw new Error(`Failed to get info: ${error.message}`);
        }
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
            return '0 Bytes';
        }

        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Bytes';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const size = Math.round((bytes / Math.pow(1024, i)) * 100) / 100;
        
        return `${size} ${sizes[i] || 'Bytes'}`;
    }

    /**
     * Get file type category
     */
    getFileCategory(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            return 'other';
        }

        try {
            const ext = path.extname(filePath).toLowerCase();
            
            const categories = {
                'web': ['.html', '.htm', '.css', '.scss', '.sass', '.less', '.js', '.mjs', '.ts', '.jsx', '.tsx'],
                'document': ['.md', '.markdown', '.txt', '.rst', '.adoc', '.doc', '.docx', '.pdf'],
                'data': ['.json', '.xml', '.yml', '.yaml', '.csv', '.toml', '.ini'],
                'code': ['.py', '.java', '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.go', '.rs'],
                'script': ['.sh', '.bash', '.bat', '.ps1', '.fish', '.zsh'],
                'config': ['.cfg', '.conf', '.env', '.gitignore', '.dockerfile'],
                'database': ['.sql', '.sqlite', '.db'],
                'image': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico'],
                'archive': ['.zip', '.tar', '.gz', '.rar', '.7z']
            };

            for (const [category, extensions] of Object.entries(categories)) {
                if (extensions.includes(ext)) {
                    return category;
                }
            }

            return 'other';
        } catch (error) {
            console.error('Error determining file category:', error);
            return 'other';
        }
    }

    /**
     * Get configuration object
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Update configuration (useful for dynamic config changes)
     */
    updateConfig(newConfig) {
        if (newConfig && typeof newConfig === 'object') {
            this.config = { ...this.config, ...newConfig };
        }
    }

    /**
     * Safely get relative path for display
     */
    getDisplayPath(fullPath) {
        try {
            const relativePath = path.relative(this.baseDir, fullPath);
            return relativePath.startsWith('..') ? path.basename(fullPath) : relativePath;
        } catch (error) {
            return path.basename(fullPath);
        }
    }
}

module.exports = FileManager;