import express from 'express';
import { Zirve } from '@zirve/sdk';

const app = express();
const port = 8080;

// Initialize Zirve SDK Client
const zirveClient = Zirve.init();

async function init() {
    // SDK is initialized synchronously
}

app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});

app.get('/api/sdk-status', async (req, res) => {
    try {
        const TIMEOUT_MS = 3000;
        const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
            Promise.race([
                promise,
                new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
            ]);

        const checks = [
            { name: 'PostgreSQL', fn: () => withTimeout(zirveClient.db.health(), TIMEOUT_MS) },
            { name: 'Redis', fn: () => withTimeout(zirveClient.cache.health(), TIMEOUT_MS) },
            { name: 'MinIO', fn: () => withTimeout(zirveClient.storage.health(), TIMEOUT_MS) },
        ];

        const starts = checks.map(() => Date.now());
        const results = await Promise.allSettled(
            checks.map((c, i) => {
                starts[i] = Date.now();
                return c.fn();
            })
        );

        const statuses = checks.map((c, i) => ({
            service: c.name,
            status: results[i].status === 'fulfilled' ? (results[i] as any).value : false,
            latency_ms: `${Date.now() - starts[i]}ms`,
        }));

        res.json(statuses);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

init().then(() => {
    app.listen(port, () => {
        console.log(`Zirve Pilot Node listening at http://localhost:${port}`);
    });
}).catch(err => {
    console.error("Failed to initialize Zirve Client", err);
    process.exit(1);
});
