// src/components/VerbalStage.jsx
import { useEffect, useRef, useState } from 'react';

export default function VerbalStage() {
  const [transcript, setTranscript] = useState('');
  const [micActive, setMicActive] = useState(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunkBufferRef = useRef([]);
  const isRecordingFinalRef = useRef(false);

  useEffect(() => {
    let myvad;

    async function startVAD() {
      const vad = window?.vad || window;
      if (!vad || !vad.MicVAD) {
        console.error("❌ MicVAD not found on window");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("✅ Microphone access granted");
        streamRef.current = stream;

        myvad = await vad.MicVAD.new({
          onSpeechStart: () => {
            if (micActive) return;
            console.log("🎙️ Speech started");
            setMicActive(true);
            chunkBufferRef.current = [];

            const recorder = new MediaRecorder(streamRef.current, {
              mimeType: 'audio/webm;codecs=opus'
            });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = e => {
              if (e.data.size > 0) chunkBufferRef.current.push(e.data);
            };

            recorder.onstop = () => {
              console.log("🛑 Recorder stopped, sending...");
              const blob = new Blob(chunkBufferRef.current, { type: 'audio/webm' });
              sendToTranscription(blob, isRecordingFinalRef.current);
            };

            recorder.start();
          },

          onSpeechEnd: () => {
            console.log("🤐 Speech ended");
            setMicActive(false);
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
          },

          onFrameProcessed: (res) => {
            const prob = res?.prob ?? res?.speech_prob ?? 'undefined';
            console.log("🧠 VAD probability:", prob);
          },

          modelURL: '/vad/silero_vad.onnx',
          throttleTime: 200,
          positiveSpeechThreshold: 0.5, // more sensitive
          negativeSpeechThreshold: 0.3,
        });

        await myvad.start();
        console.log("✅ VAD started");

        // Stop recording after 10 mins
        setTimeout(() => {
          console.log("⏱️ Time limit reached. Sending final audio...");
          isRecordingFinalRef.current = true;
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, 10 * 60 * 1000);
      } catch (err) {
        console.error("❌ Error initializing mic or VAD:", err);
      }
    }

    startVAD();

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      myvad?.stop?.();
    };
  }, []);

  async function sendToTranscription(blob, isFinal = false) {
    const formData = new FormData();
    const filename = isFinal ? 'verbal-final.webm' : 'verbal-fragment.webm';
    formData.append('file', blob, filename);

    try {
      const res = await fetch('https://hook.eu2.make.com/crk1ln2mgic8nkj5ey5eoxij9p1l7c1e', {
        method: 'POST',
        body: formData,
      });

      let json;
      try {
        json = await res.json();
      } catch (jsonErr) {
        const fallbackText = await res.text();
        console.error("❌ Transcription response was not JSON:", fallbackText);
        return;
      }

      const decodedText = new TextDecoder('utf-8').decode(
        Uint8Array.from(atob(json.reply), c => c.charCodeAt(0))
      ).trim();

      setTranscript(prev => prev + '\n' + decodedText);
    } catch (err) {
      console.error('❌ Transcription error:', err);
    }
  }

  return (
    <div className="bg-yellow-100 min-h-screen p-6 space-y-6">
      <h2 className="text-2xl font-bold text-yellow-800">🟡 Stage 4 – Verbal Presentation</h2>

      <div className="flex items-center space-x-3">
        <div className={`w-4 h-4 rounded-full ${micActive ? 'bg-red-500 animate-ping' : 'bg-gray-300'}`}></div>
        <p>{micActive ? '🎙️ Listening… Speak now' : 'Waiting for speech…'}</p>
      </div>

      <button
        onClick={() => {
          console.log("🔘 Manual stop triggered");
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }}
        className="bg-red-200 text-red-800 px-4 py-1 rounded"
      >
        ⏹️ Force Stop
      </button>

      {transcript && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">📝 Transcript</h3>
          <pre className="whitespace-pre-wrap text-gray-800">{transcript}</pre>
        </div>
      )}
    </div>
  );
}
