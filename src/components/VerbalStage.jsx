import { useEffect, useRef, useState } from 'react';

function VerbalStage() {
  const [transcript, setTranscript] = useState('');
  const [micActive, setMicActive] = useState(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunkBufferRef = useRef([]);
  const allChunksRef = useRef([]);
  const recordingFinalNow = useRef(false);
  const recordingEndedRef = useRef(false);
  const vadInstanceRef = useRef(null);

  // ... audio logic remains unchanged ...

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-yellow-100 py-10 px-6 sm:px-12 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <h1 className="text-3xl font-bold text-yellow-800 flex items-center gap-2">
          <span role="img" aria-label="tooth">🦷</span> DTP Case 1 Simulation
        </h1>

        <div className="flex items-center gap-2 text-lg text-yellow-700">
          <span className="text-2xl">🔴</span>
          <span className={micActive ? 'animate-pulse text-red-600' : ''}>
            {micActive ? 'Listening... Speak now' : 'Waiting for speech...'}
          </span>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
                console.log("⏹️ Force stop triggered");
              }
            }}
            className="bg-red-100 hover:bg-red-200 text-red-800 font-semibold px-4 py-2 rounded-lg shadow"
          >
            ⏹️ Force Stop
          </button>

          <button
            onClick={handleFinal}
            className="bg-green-100 hover:bg-green-200 text-green-800 font-semibold px-4 py-2 rounded-lg shadow"
          >
            📤 Send as Final (Test)
          </button>
        </div>

        {transcript && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6 overflow-x-auto">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">📄 Transcript / Feedback
            </h2>
            <pre className="whitespace-pre-wrap break-words text-gray-700 text-base leading-relaxed">
              {transcript}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerbalStage;
