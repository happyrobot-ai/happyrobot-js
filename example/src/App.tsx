import React from "react";
import HappyrobotClient from "@happyrobot-ai/happyrobot-js";

type State = "init" | "connecting" | "waiting" | "ready" | "error";

function App() {
	// Create happyrobot client
	const [client] = React.useState(() => new HappyrobotClient("<api-key>"));

	// Create state
	const [state, setState] = React.useState<State>("init");
	const start = () => {
		// Start the call for the given assistant id
		client.start("<assistant-id>");
		setState("connecting");

		// Subscribe to event listeners
		client.on("call-started", () => {
			setState("waiting");
		});

		client.on("call-ended", () => {
			setState("init");
		});

		client.on("participant-joined", () => {
			setState("ready");
		});

		client.on("participant-left", () => {
			// When the user leaves, stop the call
			client.stop();
		});

		client.on("error", (e) => {
			console.error("Error", e);
			setState("error");
		});
	};

	const stop = () => {
		client.stop();
	};

	if (state == "init") {
		return (
			<div className="w-full h-screen flex items-center justify-center">
				<button
					className="bg-gray-100 border border-gray-300 px-2 rounded-md hover:bg-gray-200"
					onClick={() => start()}
				>
					Start
				</button>
			</div>
		);
	}
	if (state === "connecting") {
		return (
			<div className="w-full h-screen flex items-center justify-center">
				<h2 className="font-semibold text-xl">Preparing Web Call...</h2>
			</div>
		);
	}

	if (state === "waiting") {
		return (
			<div className="w-full h-screen flex items-center justify-center">
				<h2 className="font-semibold text-xl">Waiting for the assistant...</h2>
			</div>
		);
	}

	if (state === "error") {
		return (
			<div className="w-full h-screen flex items-center justify-center">
				<h2 className="font-semibold text-xl text-red-800">
					There was an error...
				</h2>
			</div>
		);
	}

	return (
		<div className="w-full h-screen flex items-center justify-center">
			<button
				className="bg-gray-100 border border-gray-300 px-2 rounded-md hover:bg-gray-200"
				onClick={() => stop()}
			>
				Terminate
			</button>
		</div>
	);
}

export default App;
