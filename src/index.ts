import axios, { type AxiosInstance } from 'axios';

type EvaluationResponse = {
    data: {
        flags: {
            [flag: string]: {
                enabled: boolean;
            };
        }
    };
};

type Cache = {
    [key: string]: Evaluation;
};

interface IdentityReference {
    type: string;
    key: string;
}

interface Options {
    environmentKey: string;
    defaultFlags?: EvaluationResponse['data']['flags'];
    defaultIdentities?: (string | IdentityReference)[];
    baseURL?: string;
    timeout?: number;
}

export class Evaluation {
    private response: EvaluationResponse;

    constructor(response: EvaluationResponse) {
        this.response = response;
    }

    public isFeatureEnabled(flag: string): boolean {
        return this.response.data.flags[flag]?.enabled || false;
    }

    public getAllFlags(): EvaluationResponse['data']['flags'] {
        return { ...this.response.data.flags };
    }
}

export class FecusioCore {
    private api: AxiosInstance;
    private environmentKey: string;
    private defaultFlags: EvaluationResponse['data']['flags'];
    private defaultIdentities?: (string | IdentityReference)[];
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

    public setDefaultIdentities(identities: (string | IdentityReference)[] | undefined): void {
        this.defaultIdentities = identities;
    }

    private getCacheKey(identities: (string | IdentityReference)[] | undefined): string {
        if (identities === undefined) {
            return 'default';
        }
        return identities.map(identity =>
            typeof identity === 'string' ? identity : `${identity.type}-${identity.key}`
        ).join(',');
    }


    public clearCache(): void {
        this.cache = {};
    }

    public async evaluate(identities?: (string | IdentityReference)[], fresh: boolean = false): Promise<Evaluation> {
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

            return new Evaluation({
                data: {
                    flags: this.defaultFlags || {}
                }
            });
        }
    }
}
