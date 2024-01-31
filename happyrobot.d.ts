/// <reference types="node" />
import EventEmitter from "events";
type HappyrobotEventNames = "call-end" | "call-start" | "participant-joined" | "participant-left" | "error";
type HappyrobotEventListeners = {
    "call-end": () => void;
    "call-start": () => void;
    "participant-joined": (user_name: string, session_id: string) => void;
    "participant-left": (session_id: string) => void;
    error: (error: any) => void;
};
declare class HappyrobotEventEmitter extends EventEmitter {
    on<E extends HappyrobotEventNames>(event: E, listener: HappyrobotEventListeners[E]): this;
    once<E extends HappyrobotEventNames>(event: E, listener: HappyrobotEventListeners[E]): this;
    emit<E extends HappyrobotEventNames>(event: E, ...args: Parameters<HappyrobotEventListeners[E]>): boolean;
    removeListener<E extends HappyrobotEventNames>(event: E, listener: HappyrobotEventListeners[E]): this;
    removeAllListeners(event?: HappyrobotEventNames): this;
}
export default class HappyrobotClient extends HappyrobotEventEmitter {
    private apiKey;
    private baseUrl;
    private started;
    callId: string | null;
    private call;
    constructor(apiKey: string, apiBaseUrl?: string);
    private cleanup;
    start(assistant_id: string): Promise<null>;
    stop(): void;
}
export {};
