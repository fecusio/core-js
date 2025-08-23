import axios, {type AxiosInstance} from 'axios';

interface ConfigEvaluationSucceededEvent {
    type: 'config.evaluation.succeeded';
    data: {
        response: EvaluationResponse;
    };
}

interface ConfigEvaluationFailedEvent {
    type: 'config.evaluation.failed';
    data: {
        error: unknown;
    };
}

interface FlagEvaluationSucceededEvent {
    type: 'flag.evaluation.succeeded';
    data: {
        environment_id: string;
        flag_key: string;
        enabled: boolean;
    };
}

export type FecusioCoreEvent = ConfigEvaluationSucceededEvent | ConfigEvaluationFailedEvent | FlagEvaluationSucceededEvent;

export type FecusioCoreEventHandler = (event: FecusioCoreEvent) => void;

type EvaluationResponse = {
    data: {
        flags: {
            [flag: string]: {
                enabled: boolean;
            };
        }
    };
    meta?: {
        organization_id: string;
        workspace_id: string;
        environment_id: string;
    }
};

type Cache = {
    [key: string]: FecusioCoreEvaluation;
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
    eventHandler?: FecusioCoreEventHandler;
}

export class FecusioCoreEvaluation {
    private response: EvaluationResponse;
    private eventHandler?: FecusioCoreEventHandler;

    constructor(response: EvaluationResponse, eventHandler?: FecusioCoreEventHandler) {
        this.response = response;
        this.eventHandler = eventHandler;
    }

    public isFeatureEnabled(flag: string): boolean {
        const isEnabled = this.response.data.flags[flag]?.enabled;

        if (this.eventHandler && isEnabled !== undefined && this.response.meta) {
            this.eventHandler({
                type: 'flag.evaluation.succeeded',
                data: {
                    environment_id: this.response.meta.environment_id,
                    flag_key: flag,
                    enabled: isEnabled
                }
            });
        }

        return isEnabled || false;
    }

    public getAllFlags(): EvaluationResponse['data']['flags'] {
        return {...this.response.data.flags};
    }
}

export class FecusioCore {
    private api: AxiosInstance;
    private environmentKey: string;
    private defaultFlags: EvaluationResponse['data']['flags'];
    private defaultIdentities?: (string | IdentityReference)[];
    private cache: Cache = {};
    private eventHandlers: FecusioCoreEventHandler[] = [];

    private trackingQueue: FlagEvaluationSucceededEvent[] = [];
    private trackingTimeout: NodeJS.Timeout | null = null;
    private readonly TRACKING_DEBOUNCE_MS = 2000;

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

        // Add default event handler for tracking flag evaluations
        this.addEventListener(this.trackFlagEvaluation.bind(this));

        // Add user-provided event handler
        if (options.eventHandler) {
            this.addEventListener(options.eventHandler);
        }
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

    private addEventListener(handler: FecusioCoreEventHandler): void {
        if (!this.eventHandlers.includes(handler)) {
            this.eventHandlers.push(handler);
        }
    }

    private notifyEventHandlers(event: FecusioCoreEvent): void {
        for (const handler of this.eventHandlers) {
            try {
                handler(event);
            } catch (error) {
                console.error('Error in event handler:', error);
            }
        }
    }

    private trackFlagEvaluation(event: FecusioCoreEvent): void {
        if (event.type === 'flag.evaluation.succeeded') {
            // Add the event data to the queue
            this.trackingQueue.push(event);

            // Set up debounced sending if not already scheduled
            if (!this.trackingTimeout) {
                this.trackingTimeout = setTimeout(() => {
                    this.sendBatchedTrackingEvents();
                }, this.TRACKING_DEBOUNCE_MS);
            }
        }
    }

    private sendBatchedTrackingEvents(): void {
        if (this.trackingQueue.length === 0) {
            this.trackingTimeout = null;
            return;
        }

        // Clone the queue and clear it immediately to avoid missing events
        const eventsToSend = [...this.trackingQueue];
        this.trackingQueue = [];
        this.trackingTimeout = null;

        this.api.post('/evaluations/track', {
            events: eventsToSend
        }).catch(error => {
            console.error('Error tracking flag evaluations batch:', error);
        });
    }

    public async evaluate(identities?: (string | IdentityReference)[], fresh: boolean = false): Promise<FecusioCoreEvaluation> {
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

            const evaluation = new FecusioCoreEvaluation(response.data, this.notifyEventHandlers.bind(this));

            this.cache[cacheKey] = evaluation;
            
            this.notifyEventHandlers({
                type: 'config.evaluation.succeeded' as const,
                data: {
                    response: response.data
                }
            });

            return evaluation;
        } catch (error) {
            this.notifyEventHandlers({
                type: 'config.evaluation.failed' as const,
                data: { error }
            });

            return new FecusioCoreEvaluation({
                data: {
                    flags: this.defaultFlags || {}
                }
            }, this.notifyEventHandlers.bind(this));
        }
    }
}
