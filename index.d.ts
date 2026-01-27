/**
 * @typedef {Object} BuildConfig
 * @property {'browser' | 'node' | 'neutral'} [platform] - The platform target
 * @property {string | string[]} [target] - The target ES version
 * @property {'iife' | 'cjs' | 'esm'} [format] - The output format
 */
/**
 * @typedef {Object} BuilderOptions
 * @property {string} [cwd] - Current working directory. Defaults to process.cwd()
 * @property {string} [resourceName] - Name of the resource. Defaults to the basename of the cwd
 * @property {string[]} [args] - Command line arguments. Defaults to process.argv.slice(2)
 * @property {string} [restartEndpoint] - Endpoint for restarting the resource. Defaults to 'http://127.0.0.1:4689/rr'
 * @property {number} [restartTimeout] - Timeout for restart requests in milliseconds. Defaults to 2000
 * @property {number} [debounceDelay] - Debounce delay for rebuilds in milliseconds. Defaults to 500
 * @property {number} [webDevPort] - Port for web dev server. Defaults to 5173
 * @property {Record<string, BuildConfig>} [builds] - Build configurations for different targets
 * @property {Record<string, string>} [define] - Additional esbuild define values
 */
/**
 * Build a FiveM/RedM resource with optional watch mode
 * @param {BuilderOptions} [options] - Build configuration options
 * @returns {Promise<void>}
 */
export function build(options?: BuilderOptions): Promise<void>;
export type BuildConfig = {
    /**
     * - The platform target
     */
    platform?: "browser" | "node" | "neutral";
    /**
     * - The target ES version
     */
    target?: string | string[];
    /**
     * - The output format
     */
    format?: "iife" | "cjs" | "esm";
};
export type BuilderOptions = {
    /**
     * - Current working directory. Defaults to process.cwd()
     */
    cwd?: string;
    /**
     * - Name of the resource. Defaults to the basename of the cwd
     */
    resourceName?: string;
    /**
     * - Command line arguments. Defaults to process.argv.slice(2)
     */
    args?: string[];
    /**
     * - Endpoint for restarting the resource. Defaults to 'http://127.0.0.1:4689/rr'
     */
    restartEndpoint?: string;
    /**
     * - Timeout for restart requests in milliseconds. Defaults to 2000
     */
    restartTimeout?: number;
    /**
     * - Debounce delay for rebuilds in milliseconds. Defaults to 500
     */
    debounceDelay?: number;
    /**
     * - Port for web dev server. Defaults to 5173
     */
    webDevPort?: number;
    /**
     * - Build configurations for different targets
     */
    builds?: Record<string, BuildConfig>;
    /**
     * - Additional esbuild define values
     */
    define?: Record<string, string>;
};
