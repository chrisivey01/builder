import esbuild from 'esbuild';
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import { networkInterfaces } from 'node:os';
import { basename, resolve } from 'path';

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
 * @property {string} [serverIP] - Server IP address for remote access. Checks SERVER_IP or HOST env vars if not provided
 * @property {Record<string, BuildConfig>} [builds] - Build configurations for different targets
 * @property {Record<string, string>} [define] - Additional esbuild define values
 */

/**
 * Get the network IP address for remote access
 * Checks environment variables first (SERVER_IP or HOST) for remote development
 * @returns {string} The network IP address or fallback to 127.0.0.1
 */
function getNetworkIP() {
    // Check environment variables first for remote development
    if (process.env.SERVER_IP) {
        return process.env.SERVER_IP;
    }
    if (process.env.HOST) {
        return process.env.HOST;
    }

    // Try to get from network interfaces
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1'; // Fallback to localhost
}

/**
 * Build a FiveM/RedM resource with optional watch mode
 * @param {BuilderOptions} [options] - Build configuration options
 * @returns {Promise<void>}
 */
export async function build(options = {}) {
    const cwd = options.cwd || process.cwd();
    const resource_name = options.resourceName || basename(resolve(cwd));
    const args = options.args || process.argv.slice(2);
    const IS_WATCH = args.includes('--watch');
    const IS_REDM = args.includes('--redm');
    const HAS_WEB_DIR = fs.existsSync(resolve(cwd, './web'));
    const PORT = IS_REDM ? 4700 : 4689;
    const SERVER_IP = options.serverIP || getNetworkIP();

    // Configuration defaults
    const config = {
        restartEndpoint: options.restartEndpoint || `http://127.0.0.1:${PORT}/rr`,
        restartTimeout: options.restartTimeout || 2000,
        debounceDelay: options.debounceDelay || 500,
        webDevPort: options.webDevPort || 5173,
        builds: options.builds || {
            client: { platform: 'browser', target: 'es2021', format: 'iife' },
            server: { platform: 'node', target: 'node16', format: 'cjs' },
        },
        ...options
    };

    console.log(`🎮 Building ${resource_name} for ${IS_REDM ? 'RedM' : 'FiveM'}...`);

    // Update fxmanifest.lua
    const updateFxManifest = () => {
        const fxmanifestPath = resolve(cwd, './fxmanifest.lua');
        if (!fs.existsSync(fxmanifestPath)) return;

        const contents = fs.readFileSync(fxmanifestPath, 'utf8');
        let updated = contents;

        // Update game field for RedM
        if (IS_REDM) {
            updated = updated.replace(/game\s+['"]gta5['"]/, "game 'rdr3'");
            if (!updated.includes('rdr3_warning')) {
                updated = updated.replace(
                    /(game\s+['"]rdr3['"])/,
                    `$1\nrdr3_warning 'I acknowledge that this is a prerelease build of RedM, and I am aware my resources *will* become incompatible once RedM ships.'`
                );
            }
        } else {
            updated = updated.replace(/game\s+['"]rdr3['"]/, "game 'gta5'");
            updated = updated.replace(/\n?rdr3_warning\s+['"][^'"]*['"]\s*\n?/g, '\n');
        }

        // Update ui_page
        if (!HAS_WEB_DIR) {
            updated = updated.replace(/\n?\s*ui_page\s+['"][^'"]*['"]\s*\n?/g, '\n');
        } else {
            const desiredUiPage = IS_WATCH ? `ui_page 'http://${SERVER_IP}:${config.webDevPort}'` : "ui_page 'html/index.html'";
            updated = updated.match(/ui_page\s+['"][^'"]*['"]/)
                ? updated.replace(/ui_page\s+['"][^'"]*['"]/, desiredUiPage)
                : `${updated.trimEnd()}\n\n${desiredUiPage}\n`;
        }

        if (updated !== contents) {
            fs.writeFileSync(fxmanifestPath, updated, 'utf8');
        }
    };

    updateFxManifest();

    let lastRebuild = Date.now();

    // Create restart plugin
    const createRestartPlugin = () => ({
        name: 'restart-resource',
        setup(build) {
            build.onEnd(async (result) => {
                if (result.errors.length) return;

                const now = Date.now();
                if (now - lastRebuild < config.debounceDelay) return;

                lastRebuild = now;
                console.log(`\n📦 Build completed, restarting ${resource_name}...`);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.restartTimeout);

                fetch(`${config.restartEndpoint}?resource=${resource_name}`, {
                    signal: controller.signal
                })
                    .then((response) => {
                        clearTimeout(timeoutId);
                        if (response.ok) {
                            console.log(`✅ Restarted ${resource_name}`);
                        } else {
                            console.error(`⚠️  Restart returned: ${response.status}`);
                        }
                    })
                    .catch((error) => {
                        clearTimeout(timeoutId);
                        if (error.name === 'AbortError') {
                            console.error(`⚠️  Restart timed out (server might not be running)`);
                        } else {
                            console.error(`⚠️  Restart failed: ${error.message}`);
                        }
                    });
            });
        },
    });

    // Build configuration
    const getBuildConfig = (name, buildConfig) => ({
        bundle: true,
        entryPoints: [resolve(cwd, `./${name}/main.ts`)],
        outfile: resolve(cwd, `dist/${name}.js`),
        sourcemap: true,
        logLevel: 'info',
        define: {
            GAME: IS_REDM ? '"REDM"' : '"FIVEM"',
            ...(config.define || {})
        },
        ...buildConfig,
    });

    if (IS_WATCH) {
        // Watch mode
        await Promise.all(
            Object.entries(config.builds).map(async ([name, buildConfig]) => {
                const ctx = await esbuild.context({
                    ...getBuildConfig(name, buildConfig),
                    plugins: [createRestartPlugin()],
                });

                await ctx.watch();
                console.log(`👀 Watching ${name}...`);
            })
        );

        if (HAS_WEB_DIR) {
            console.log('🌐 Starting web dev server...');
            const webProcess = spawn('pnpm', ['dev'], {
                cwd: resolve(cwd, './web'),
                stdio: 'inherit',
                shell: true
            });

            webProcess.on('error', (error) => {
                console.error('Failed to start web dev server:', error);
            });
        } else {
            console.log('✅ Watch mode active. Press Ctrl+C to stop.');
            await new Promise(() => { });
        }
    } else {
        // Build mode
        await Promise.all(
            Object.entries(config.builds).map(async ([name, buildConfig]) => {
                await esbuild.build(getBuildConfig(name, buildConfig));
                console.log(`✅ Built ${name}`);
            })
        );

        if (HAS_WEB_DIR) {
            console.log('🌐 Building web...');
            execSync('pnpm build', { cwd: resolve(cwd, './web'), stdio: 'inherit' });
            console.log('✅ Web build completed');
        }

        process.exit(0);
    }
}
