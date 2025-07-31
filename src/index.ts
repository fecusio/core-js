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
    defaultIdentities?: string[];
    baseURL?: string;
    timeout?: number;
}

export class Evaluation {
    private response: EvaluationResponse;

    constructor(response: EvaluationResponse) {
        this.response = response;
    }

    public isFeatureEnabled(flag: string): boolean {
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
    private defaultIdentities?: string[];
    private cache: Cache = {};

    constructor(options: Options) {
        this.environmentKey = options.environmentKey;
        this.defaultFlags = options.defaultFlags || {};
        this.defaultIdentities = options.defaultIdentities;

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

    public setDefaultIdentities(identities: string[] | undefined): void {
        this.defaultIdentities = identities;
    }

    private getCacheKey(identities: string[] | undefined): string {
        if (identities === undefined) {
            return 'default';
        }
        return identities.join(',');
    }

    public clearCache(): void {
        this.cache = {};
    }

    public async evaluate(identities?: string[], fresh: boolean = false): Promise<Evaluation> {
        if (identities === undefined) {
            identities = this.defaultIdentities;
        }

        const cacheKey = this.getCacheKey(identities);

        if (!fresh && this.cache[cacheKey]) {
            return this.cache[cacheKey];
        }

        try {
            const response = await this.api.post<EvaluationResponse>('/evaluate', { 
                identities: identities
            });

            const evaluation = new Evaluation(response.data);

            this.cache[cacheKey] = evaluation;

            return evaluation;
        } catch (error) {
            console.error('Fecusio Core API request failed, using default flags', error);

            return new Evaluation({ data: this.defaultFlags || {} });
        }
    }
}
