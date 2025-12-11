export interface RxNavResult {
    name: string;
    rxcui?: string;
}

const BASE_URL = 'https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search';

export const searchDrugs = async (query: string): Promise<RxNavResult[]> => {
    if (!query || query.length < 2) return [];

    try {
        const response = await fetch(`${BASE_URL}?terms=${encodeURIComponent(query)}&ef=RXCUIS&maxList=20`);

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        const names = data[1] as string[];
        const extras = data[2] as { RXCUIS?: string[][] };

        if (names && names.length > 0) {
            return names.map((name, index) => {
                const rxcuiList = extras?.RXCUIS?.[index];
                const rxcui = rxcuiList && rxcuiList.length > 0 ? rxcuiList[0] : undefined;

                return {
                    name: name,
                    rxcui: rxcui
                };
            });
        }

        return [];
    } catch (error) {
        console.error("Drug Search API Error:", error);
        return getFallbackDrugs(query);
    }
};

export const getFallbackDrugs = (query: string): RxNavResult[] => {
    const common = [
        { name: 'Lisinopril', rxcui: '29046' },
        { name: 'Atorvastatin', rxcui: '83367' },
        { name: 'Metformin', rxcui: '6809' },
        { name: 'Amlodipine', rxcui: '17767' },
        { name: 'Levothyroxine', rxcui: '10582' },
        { name: 'Omeprazole', rxcui: '7646' },
        { name: 'Losartan', rxcui: '52486' },
        { name: 'Gabapentin', rxcui: '25480' },
        { name: 'Hydrochlorothiazide', rxcui: '5487' },
        { name: 'Sertraline', rxcui: '36437' },
        { name: 'Simvastatin', rxcui: '36567' },
        { name: 'Ibuprofen', rxcui: '5640' },
        { name: 'Acetaminophen', rxcui: '161' },
        { name: 'Albuterol', rxcui: '435' },
        { name: 'Cetirizine', rxcui: '20610' },
    ];
    return common.filter(d => d.name.toLowerCase().includes(query.toLowerCase()));
};
