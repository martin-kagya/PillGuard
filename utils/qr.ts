import { DrugForm } from '../types';

export const parseQRData = (urlOrData: string): any => {
    try {
        let jsonString = urlOrData;

        // Check if it's a deep link url (pillguard://add?data=...)
        if (urlOrData.includes('pillguard://') && urlOrData.includes('data=')) {
            const params = urlOrData.split('data=')[1];
            // Decode Base64
            // In RN, we can use a polyfill or just simple atob if available (configured in index.js usually)
            // Or use Buffer.
            // But usually we can just rely on JSON.parse check.
            // If encoded, we need decoding.
            // Let's assume standard Base64 for URL safety.

            // Note: React Native built-in atob/btoa might need polyfill.
            // For now, let's assume raw JSON string in query param for simplicity in POC, 
            // OR use a simple decodeURIComponent if it's just URL encoded.

            // BETTER: Use decodeURIComponent(params)
            jsonString = decodeURIComponent(params);

            // Check if base64 encoded (starts with eyJ for {"...)
            if (jsonString.startsWith('eyJ')) {
                // Decode base64 
                jsonString = atob(jsonString); // Requires polyfill in some RN versions
            }
        }

        // Final sanity check: must look like JSON
        if (!jsonString.startsWith('{') || !jsonString.endsWith('}')) {
            // Not a JSON object, possibly just a plain URL we shouldn't handle
            return null;
        }

        const data = JSON.parse(jsonString);

        // Basic Validation
        if (!data.name) throw new Error("Missing medication name");

        // Validate Form
        if (data.form) {
            const validForms = Object.values(DrugForm);
            // Case-insensitive check
            const normalizedForm = data.form.toUpperCase();
            if ((validForms as string[]).includes(normalizedForm)) {
                data.form = normalizedForm;
            } else {
                // Invalid form provided, default to Tablet
                console.warn(`Invalid DrugForm '${data.form}' in QR code. Defaulting to TABLET.`);
                data.form = DrugForm.TABLET;
            }
        } else {
            // Missing form, default to Tablet
            data.form = DrugForm.TABLET;
        }

        return data;
    } catch (e) {
        // console.warn("Failed to parse QR data", e); // Silence logs for routine non-matches
        return null;
    }
};

// Simple Base64 decode polyfill for RN if atob missing
function atob(input: string) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = input.replace(/=+$/, '');
    let output = '';

    if (str.length % 4 == 1) {
        throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (let bc = 0, bs = 0, buffer, i = 0;
        buffer = str.charAt(i++);
        ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
            bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
        buffer = chars.indexOf(buffer);
    }
    return output;
}
