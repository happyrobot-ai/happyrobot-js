"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const daily_js_1 = __importDefault(require("@daily-co/daily-js"));
const axios_1 = __importDefault(require("axios"));
const events_1 = __importDefault(require("events"));
class HappyrobotEventEmitter extends events_1.default {
    on(event, listener) {
        super.on(event, listener);
        return this;
    }
    once(event, listener) {
        super.once(event, listener);
        return this;
    }
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
    removeListener(event, listener) {
        super.removeListener(event, listener);
        return this;
    }
    removeAllListeners(event) {
        super.removeAllListeners(event);
        return this;
    }
}
function destroyAudioPlayer(participantId) {
    const player = document.querySelector(`audio[data-participant-id="${participantId}"]`);
    player === null || player === void 0 ? void 0 : player.remove();
}
function startPlayer(player, track) {
    return __awaiter(this, void 0, void 0, function* () {
        player.muted = false;
        player.autoplay = true;
        if (track != null) {
            player.srcObject = new MediaStream([track]);
            yield player.play();
        }
    });
}
function buildAudioPlayer(track, participantId) {
    return __awaiter(this, void 0, void 0, function* () {
        const player = document.createElement("audio");
        player.dataset.participantId = participantId;
        document.body.appendChild(player);
        yield startPlayer(player, track);
        return player;
    });
}
function subscribeToTracks(e, call) {
    if (e.participant.local)
        return;
    call.updateParticipant(e.participant.session_id, {
        setSubscribedTracks: {
            audio: true,
            video: false,
        },
    });
}
class HappyrobotClient extends HappyrobotEventEmitter {
    constructor(apiKey, apiBaseUrl) {
        super();
        this.started = false;
        this.callId = null;
        this.call = null;
        this.apiKey = apiKey;
        this.baseUrl = apiBaseUrl || "https://app.happyrobot.ai";
    }
    cleanup() {
        var _a;
        this.started = false;
        (_a = this.call) === null || _a === void 0 ? void 0 : _a.destroy();
        this.call = null;
        this.callId = null;
    }
    start(assistant_id) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.started) {
                return null;
            }
            this.started = true;
            try {
                // Create web call
                const { data } = yield axios_1.default
                    .post(`${this.baseUrl}/api/call/web`, { assistant_id: assistant_id }, { headers: { Authorization: `Bearer ${this.apiKey}` } });
                this.callId = data.id;
                // Create daily call
                this.call = daily_js_1.default.createCallObject({
                    audioSource: true,
                    videoSource: false,
                });
                (_a = this.call.iframe()) === null || _a === void 0 ? void 0 : _a.style.setProperty("display", "none");
                this.call.on("error", (e) => {
                    this.emit("error", e);
                });
                this.call.on("left-meeting", () => {
                    this.emit("call-end");
                    this.cleanup();
                });
                this.call.on("participant-joined", (e) => {
                    if (!e || !this.call)
                        return;
                    // Subscribe the participant to audio tracks
                    subscribeToTracks(e, this.call);
                    this.emit("participant-joined", e.participant.user_name, e.participant.session_id);
                });
                this.call.on("participant-left", (e) => {
                    if (!e)
                        return;
                    // Remove participant audio player
                    destroyAudioPlayer(e.participant.session_id);
                    this.emit("participant-left", e.participant.session_id);
                });
                this.call.on("track-started", (e) => __awaiter(this, void 0, void 0, function* () {
                    var _b;
                    if (!e || !e.participant)
                        return;
                    if ((_b = e.participant) === null || _b === void 0 ? void 0 : _b.local)
                        return;
                    if (e.track.kind !== "audio")
                        return;
                    // Create the web audio player
                    yield buildAudioPlayer(e.track, e.participant.session_id);
                }));
                // Join the call
                yield this.call.join({
                    url: data.url,
                    subscribeToTracksAutomatically: false,
                });
                // Add noise cancellation
                this.call.updateInputSettings({
                    audio: {
                        processor: {
                            type: "noise-cancellation",
                        },
                    },
                });
                return null;
            }
            catch (e) {
                console.error(e);
                this.emit("error", e);
                this.cleanup();
                return null;
            }
        });
    }
    stop() {
        var _a;
        this.started = false;
        (_a = this.call) === null || _a === void 0 ? void 0 : _a.destroy();
        this.call = null;
        this.callId = null;
    }
}
exports.default = HappyrobotClient;
