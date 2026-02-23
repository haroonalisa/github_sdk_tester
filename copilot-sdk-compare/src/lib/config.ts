import fs from 'fs';
import path from 'path';

export function getVendorKeys() {
    try {
        const configPath = path.join(process.cwd(), 'vendor-config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        console.error('Failed to read vendor config:', error);
    }
    return {};
}
