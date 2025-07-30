import axios, { type AxiosInstance } from 'axios';

type EvaluationResponse = {
    data: {
        [flag: string]: {
            enabled: boolean;
        };
    };
};

type Cache = {
    [key: string]: Evaluation;
};

interface Options {
    environmentKey: string;
    defaultFlags?: EvaluationResponse['data'];
    defaultIdentitiesContext?: string[];
    baseURL?: string;
    timeout?: number;
}

export class Evaluation {
    private response: EvaluationResponse;

    constructor(response: EvaluationResponse) {
        this.response = response;
    }

    public isFeatureEnabled(flag: string): boolean {
        if (!flag || typeof flag !== 'string') {
            return false;
        }
        return this.response.data[flag]?.enabled ?? false;
    }

    public getAllFlags(): EvaluationResponse['data'] {
        return { ...this.response.data };
    }
}

export class FecusioCore {
    private api: AxiosInstance;
    private environmentKey: string;
    private defaultFlags: EvaluationResponse['data'];
    private defaultIdentitiesContext?: string[];
    private cache: Cache = {};

    constructor(options: Options) {
        if (!options.environmentKey || typeof options.environmentKey !== 'string') {
            throw new Error('environmentKey is required and must be a string');
        }

        this.environmentKey = options.environmentKey;
        this.defaultFlags = options.defaultFlags || {};
        this.defaultIdentitiesContext = options.defaultIdentitiesContext;

        this.api = axios.create({
            baseURL: options.baseURL || 'https://core.fecusio.com/v1/',
            timeout: options.timeout || 5000,
            headers: {
                'X-Environment-Key': this.environmentKey,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });
    }

    public setDefaultIdentitiesContext(defaultIdentitiesContext: string[] | undefined): void {
        this.defaultIdentitiesContext = defaultIdentitiesContext;
    }

    private getCacheKey(identities: string[] | undefined): string {
        if (identities === undefined) {
            return 'default';
        }
        return identities.join(',');
    }

    public async evaluate(identitiesContext?: string[], fresh: boolean = false): Promise<Evaluation> {
        if (identitiesContext === undefined) {
            identitiesContext = this.defaultIdentitiesContext;
        }

        const cacheKey = this.getCacheKey(identitiesContext);

        if (!fresh && this.cache[cacheKey]) {
            return this.cache[cacheKey];
        }

        try {
            const response = await this.api.post<EvaluationResponse>('/evaluate', { 
                identities: identitiesContext 
            });
            const evaluation = new Evaluation(response.data);
            this.cache[cacheKey] = evaluation;
            return evaluation;
        } catch (error) {
            // Log error in development
            if (process.env.NODE_ENV === 'development') {
                console.warn('Fecusio Core API request failed, using default flags:', error);
            }
            
            // Return evaluation with default flags
            return new Evaluation({ data: this.defaultFlags || {} });
        }
    }

    public clearCache(): void {
        this.cache = {};
    }

    public getCacheSize(): number {
        return Object.keys(this.cache).length;
    }
}
