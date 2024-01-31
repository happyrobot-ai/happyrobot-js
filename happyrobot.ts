import DailyIframe, {
	DailyCall,
	DailyEventObjectParticipant
} from "@daily-co/daily-js";
import axios from "axios";
import EventEmitter from "events";

type HappyrobotEventNames =
	| "call-started"
	| "call-ended"
	| "participant-joined"
	| "participant-left"
	| "error";

type HappyrobotEventListeners = {
	"call-started": () => void;
	"call-ended": () => void;
	"participant-joined": (user_name: string, session_id: string) => void;
	"participant-left": (session_id: string) => void;
	error: (error: any) => void;
};

class HappyrobotEventEmitter extends EventEmitter {
	on<E extends HappyrobotEventNames>(
		event: E,
		listener: HappyrobotEventListeners[E]
	): this {
		super.on(event, listener);
		return this;
	}
	once<E extends HappyrobotEventNames>(
		event: E,
		listener: HappyrobotEventListeners[E]
	): this {
		super.once(event, listener);
		return this;
	}
	emit<E extends HappyrobotEventNames>(
		event: E,
		...args: Parameters<HappyrobotEventListeners[E]>
	): boolean {
		return super.emit(event, ...args);
	}
	removeListener<E extends HappyrobotEventNames>(
		event: E,
		listener: HappyrobotEventListeners[E]
	): this {
		super.removeListener(event, listener);
		return this;
	}
	removeAllListeners(event?: HappyrobotEventNames): this {
		super.removeAllListeners(event);
		return this;
	}
}

function destroyAudioPlayer(participantId: string) {
  const player = document.querySelector(
    `audio[data-participant-id="${participantId}"]`
  );
  player?.remove();
}

async function startPlayer(player: HTMLAudioElement, track: any) {
  player.muted = false;
  player.autoplay = true;
  if (track != null) {
    player.srcObject = new MediaStream([track]);
    await player.play();
  }
}
async function buildAudioPlayer(track: any, participantId: string) {
  const player = document.createElement("audio");
  player.dataset.participantId = participantId;
  document.body.appendChild(player);
  await startPlayer(player, track);
  return player;
}

function subscribeToTracks(e: DailyEventObjectParticipant, call: DailyCall) {
  if (e.participant.local) return;

  call.updateParticipant(e.participant.session_id, {
    setSubscribedTracks: {
      audio: true,
      video: false,
    },
  });
}

interface CallDetails {
	url: string;
	id: string;
}
export default class HappyrobotClient extends HappyrobotEventEmitter {
	private apiKey: string;
	private baseUrl: string;

	private started: boolean = false;
	public callId: string | null = null;
	private call: DailyCall | null = null;

	constructor(apiKey: string, apiBaseUrl?: string) {
		super();
		this.apiKey = apiKey;
		this.baseUrl = apiBaseUrl || "https://app.happyrobot.ai";
	}

	private cleanup() {
		this.started = false;
		this.call?.destroy();
		this.call = null;
		this.callId = null;
	}

	async start(assistant_id: string): Promise<null> {
		if (this.started) {
			return null;
		}

		this.started = true;

		try {
			// Create web call
			const { data } = await axios
			.post<CallDetails>(
				`${this.baseUrl}/api/call/web`,
				{assistant_id: assistant_id},
				{headers: {Authorization: `Bearer ${this.apiKey}`}}
			)
			this.callId = data.id;
			
			// Create daily call
			this.call = DailyIframe.createCallObject({
				audioSource: true,
				videoSource: false,
			});
			this.call.iframe()?.style.setProperty("display", "none");

			this.call.on("error", (e) => {
				this.emit("error", e)
			});

			this.call.on("left-meeting", () => {
				this.emit("call-ended");
				this.cleanup();
			});

			this.call.on("participant-joined", (e) => {
				if (!e || !this.call) return;
				// Subscribe the participant to audio tracks
				subscribeToTracks(e, this.call);
				this.emit("participant-joined", e.participant.user_name, e.participant.session_id);
			});

			this.call.on("participant-left", (e) => {
				if (!e) return;
				// Remove participant audio player
				destroyAudioPlayer(e.participant.session_id);
				this.emit("participant-left", e.participant.session_id);
			});

			this.call.on("track-started", async (e) => {
				if (!e || !e.participant) return;
				if (e.participant?.local) return;
				if (e.track.kind !== "audio") return;

				// Create the web audio player
				await buildAudioPlayer(e.track, e.participant.session_id);
			});

			// Join the call
			await this.call.join({
				url: data.url,
				subscribeToTracksAutomatically: false,
			});

			this.call.on("app-message", (e) => {
				if (!e) return;
				if (e.data === "listening") {
					return this.emit("call-started");
				}
			});

			// Add noise cancellation
			this.call.updateInputSettings({
				audio: {
					processor: {
						type: "noise-cancellation",
					},
				},
			});

			return null

		} catch (e) {
			console.error(e);
			this.emit("error", e);
			this.cleanup();
			return null;
		}
	}

	stop(): void {
		this.started = false;
		this.call?.destroy();
		this.call = null;
		this.callId = null;
	}
}
