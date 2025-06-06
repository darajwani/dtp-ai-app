import { useEffect, useRef, useState } from 'react';

export default function VerbalStage() {
  const [transcript, setTranscript] = useState('');
  const [micActive, setMicActive] = useState(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunkBufferRef = useRef([]);
  const recordingFinalNow = useRef(false);
  const vadInstanceRef = useRef(null);

  useEffect(() => {
    async function startVAD() {
      const vad = window?.vad || window;
      if (!vad?.MicVAD) {
        console.error("❌ MicVAD not found");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const vadInstance = await vad.MicVAD.new({
        onSpeechStart: () => {
          if (mediaRecorderRef.current?.state === 'recording') return;

          chunkBufferRef.current = [];
          setMicActive(true);

          const recorder = new MediaRecorder(streamRef.current, {
            mimeType: 'audio/webm;codecs=opus',
          });

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunkBufferRef.current.push(e.data);
          };

          recorder.onstop = () => {
            setMicActive(false);
            const blob = new Blob(chunkBufferRef.current, { type: 'audio/webm' });
            const isFinal = recordingFinalNow.current;
            const filename = isFinal ? 'verbal-final.webm' : 'verbal-fragment.webm';
            recordingFinalNow.current = false;

            sendToTranscription(blob, filename, isFinal);
          };

          mediaRecorderRef.current = recorder;
          recorder.start();
        },

        onSpeechEnd: () => {
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        },

        modelURL: '/vad/silero_vad.onnx',
        throttleTime: 200,
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.3,
      });

      await vadInstance.start();
      vadInstanceRef.current = vadInstance;
    }

    startVAD();

    return () => {
      vadInstanceRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function sendToTranscription(blob, filename, isFinal) {
    const formData = new FormData();
    formData.append('file', blob, filename);

    try {
      const res = await fetch('https://hook.eu2.make.com/crk1ln2mgic8nkj5ey5eoxij9p1l7c1e', {
        method: 'POST',
        body: formData,
      });

      const raw = await res.text();
      if (!raw.trim().startsWith('{')) {
        console.error("❌ Transcription not JSON:", raw);
        return;
      }

      const json = JSON.parse(raw);
      const decoded = new TextDecoder().decode(
        Uint8Array.from(atob(json.reply), c => c.charCodeAt(0))
      ).trim();

      if (isFinal) {
        // Append feedback with separator
        setTranscript((prev) => prev + '\n\n📋 Final Feedback:\n' + decoded);
      } else {
        setTranscript((prev) => prev + '\n' + decoded);
      }
    } catch (err) {
      console.error("❌ Transcription error:", err);
    }
  }

  function handleFinal() {
    console.log("✅ Final triggered");

    // Stop recording if active
    if (mediaRecorderRef.current?.state === 'recording') {
      recordingFinalNow.current = true;
      mediaRecorderRef.current.stop();
      console.log("🎤 Recording stopped for final");
    } else {
      console.log("⚠️ No active recording; capturing short final clip");
      recordingFinalNow.current = true;
      chunkBufferRef.current = [];

      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus',
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunkBufferRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunkBufferRef.current, { type: 'audio/webm' });
        sendToTranscription(blob, 'verbal-final.webm', true);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 1000); // 1s short final capture
    }

    // Also stop VAD + mic completely
    vadInstanceRef.current?.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    console.log("🔇 Mic and VAD fully stopped after Final");
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
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
              console.log("⏹️ Force stop triggered");
            }
          }}
          className="bg-red-200 text-red-800 px-4 py-1 rounded"
        >
          ⏹️ Force Stop
        </button>

        <button
          onClick={handleFinal}
          className="bg-green-200 text-green-800 px-4 py-1 rounded"
        >
          📤 Send as Final (Test)
        </button>
      </div>

      {transcript && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">📝 Transcript / Feedback</h3>
          <pre className="whitespace-pre-wrap text-gray-800">{transcript}</pre>
        </div>
      )}
    </div>
  );
}
