import { useEffect, useRef, useState } from 'react';

export default function VerbalStage() {
  const [transcript, setTranscript] = useState('');
  const [micActive, setMicActive] = useState(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunkBufferRef = useRef([]);
  const isFinalRef = useRef(false);
  const lastLogTimeRef = useRef(Date.now());

  useEffect(() => {
    let myvad;

    async function startVAD() {
      const vad = window?.vad || window;
      if (!vad || !vad.MicVAD) {
        console.error("❌ MicVAD not found");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        myvad = await vad.MicVAD.new({
          onSpeechStart: () => {
            if (micActive) return;

            console.log("🎙️ Speech started");
            setMicActive(true);
            chunkBufferRef.current = [];

            const recorder = new MediaRecorder(streamRef.current, {
              mimeType: 'audio/webm;codecs=opus',
            });

            recorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunkBufferRef.current.push(e.data);
            };

            recorder.onstop = () => {
              console.log("🛑 Recorder stopped, sending...");
              const finalFlag = isFinalRef.current;
              isFinalRef.current = false; // reset
              const blob = new Blob(chunkBufferRef.current, { type: 'audio/webm' });
              sendToTranscription(blob, finalFlag);
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
          },

          onSpeechEnd: () => {
            console.log("🤐 Speech ended");
            setMicActive(false);
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
          },

          onFrameProcessed: (res) => {
            const now = Date.now();
            if (now - lastLogTimeRef.current > 1000) {
              console.log("🧠 isSpeech:", res.isSpeech, "| notSpeech:", res.notSpeech);
              lastLogTimeRef.current = now;
            }
          },

          modelURL: '/vad/silero_vad.onnx',
          throttleTime: 200,
          positiveSpeechThreshold: 0.5,
          negativeSpeechThreshold: 0.3,
        });

        await myvad.start();
        console.log("✅ VAD started");

      } catch (err) {
        console.error("❌ VAD or mic error:", err);
      }
    }

    startVAD();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      myvad?.stop?.();
    };
  }, []);

  async function sendToTranscription(blob, isFinal = false) {
    const filename = isFinal ? 'verbal-final.webm' : 'verbal-fragment.webm';
    const formData = new FormData();
    formData.append('file', blob, filename);

    try {
      const res = await fetch('https://hook.eu2.make.com/crk1ln2mgic8nkj5ey5eoxij9p1l7c1e', {
        method: 'POST',
        body: formData,
      });

      const raw = await res.text();
      if (!raw.trim().startsWith('{')) {
        console.error("❌ Response not JSON:", raw);
        return;
      }

      const json = JSON.parse(raw);
      const decoded = new TextDecoder('utf-8').decode(
        Uint8Array.from(atob(json.reply), c => c.charCodeAt(0))
      ).trim();

      setTranscript((prev) => prev + '\n' + decoded);
    } catch (err) {
      console.error("❌ Transcription error:", err);
    }
  }

  function handleFinalSend() {
    console.log("✅ Send Final Triggered");
    isFinalRef.current = true;

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      // No speech detected but still trigger final blank blob
      const silentBlob = new Blob([], { type: 'audio/webm' });
      sendToTranscription(silentBlob, true);
    }
  }

  return (
    <div className="bg-yellow-100 min-h-screen p-6 space-y-6">
      <h2 className="text-2xl font-bold text-yellow-800">🟡 Stage 4 – Verbal Presentation</h2>

      <div className="flex items-center space-x-3">
        <div className={`w-4 h-4 rounded-full ${micActive ? 'bg-red-500 animate-ping' : 'bg-gray-300'}`}></div>
        <p>{micActive ? '🎙️ Listening… Speak now' : 'Waiting for speech…'}</p>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => {
            console.log("🛑 Force stop triggered");
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
          }}
          className="bg-red-200 text-red-800 px-4 py-1 rounded"
        >
          ⏹️ Force Stop
        </button>

        <button
          onClick={handleFinalSend}
          className="bg-green-200 text-green-800 px-4 py-1 rounded"
        >
          📤 Send as Final (Test)
        </button>
      </div>

      {transcript && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">📝 Transcript</h3>
          <pre className="whitespace-pre-wrap text-gray-800">{transcript}</pre>
        </div>
      )}
    </div>
  );
}
