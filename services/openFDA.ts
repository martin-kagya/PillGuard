import { apiCache } from './cache';

const BASE_URL = 'https://api.fda.gov/drug/label.json';

export interface DrugDetails {
    indications: string;
    warnings: string;
    reactions: string;
    brandName: string;
}

export const getDrugDetails = async (drugName: string): Promise<DrugDetails | null> => {
    if (!drugName) return null;

    // Clean name for search (remove dosage, etc)
    const cleanName = drugName.split('(')[0].trim();
    const cacheKey = `openfda_${cleanName.toLowerCase()}`;

    if (apiCache.has(cacheKey)) {
        return apiCache.get(cacheKey);
    }

    try {
        const query = `search=openfda.brand_name:"${encodeURIComponent(cleanName)}"&limit=1`;
        const response = await fetch(`${BASE_URL}?${query}`);

        if (!response.ok) {
            // Try generic name if brand fails
            const genericQuery = `search=openfda.generic_name:"${encodeURIComponent(cleanName)}"&limit=1`;
            const genericResponse = await fetch(`${BASE_URL}?${genericQuery}`);
            if (!genericResponse.ok) return null;

            const data = await genericResponse.json();
            const result = parseOpenFDAResponse(data);
            apiCache.set(cacheKey, result);
            return result;
        }

        const data = await response.json();
        const result = parseOpenFDAResponse(data);
        apiCache.set(cacheKey, result);
        return result;
    } catch (error) {
        console.error("OpenFDA fetch error:", error);
        return null;
    }
};

const parseOpenFDAResponse = (data: any): DrugDetails => {
    const result = data.results?.[0];
    if (!result) return { indications: '', warnings: '', reactions: '', brandName: '' };

    const getField = (field: string[]) => field ? field[0] : 'Information not available in standard label.';

    return {
        brandName: result.openfda?.brand_name?.[0] || 'Unknown',
        indications: getField(result.indications_and_usage),
        warnings: getField(result.warnings),
        reactions: getField(result.adverse_reactions)
    };
};
