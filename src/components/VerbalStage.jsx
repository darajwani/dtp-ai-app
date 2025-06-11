import { useEffect, useRef, useState } from 'react';

function VerbalStage() {
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
          console.log("🗣️ Speech detected!");
          if (mediaRecorderRef.current?.state === 'recording') return;

          chunkBufferRef.current = [];
          setMicActive(true);

          const recorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus',
          });

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunkBufferRef.current.push(e.data);
            }
          };

          recorder.onstop = () => {
            setMicActive(false);
            if (chunkBufferRef.current.length === 0) {
              console.warn("⚠️ No audio recorded, skipping submission.");
              return;
            }

            const blob = new Blob(chunkBufferRef.current, { type: 'audio/webm' });
            const filename = recordingFinalNow.current ? 'verbal-final.webm' : 'verbal-fragment.webm';
            recordingFinalNow.current = false;

            console.log(`📤 Sending file: ${filename}`);
            sendToTranscription(blob, filename);
          };

          mediaRecorderRef.current = recorder;
          recorder.start();
        },
        onSpeechEnd: () => {
          console.log("🔇 Speech ended.");
          if (!recordingFinalNow.current && mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        },
        modelURL: '/vad/silero_vad.onnx',
        throttleTime: 200,
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.3,
      });

      vadInstanceRef.current = vadInstance;
      await vadInstance.start();
    }

    startVAD();

    return () => {
      if (vadInstanceRef.current?.stop) vadInstanceRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function isBase64(str) {
    try {
      return btoa(atob(str)) === str;
    } catch {
      return false;
    }
  }

  async function sendToTranscription(blob, filename) {
    const formData = new FormData();
    formData.append('file', blob, filename);

    try {
      const res = await fetch('https://hook.eu2.make.com/crk1ln2mgic8nkj5ey5eoxij9p1l7c1e', {
        method: 'POST',
        body: formData,
      });

      console.log("✅ File sent, response status:", res.status);
      const json = await res.json();
      console.log("📦 JSON response received:", json);

      if (!json.reply) {
        console.error("❌ No 'reply' field in response");
        return;
      }

      let decoded = json.reply.trim();
      if (isBase64(decoded)) {
        decoded = atob(decoded).trim();
        console.log("🧪 Base64 decoded reply:", decoded);
      } else {
        console.log("🧾 Plain reply (no decoding needed):", decoded);
      }

      const route = json.route?.toLowerCase() || 'short';
      const label = route === 'long' ? '🟢 Final Feedback:' : '📋 Feedback:';

      setTranscript(prev => prev + `\n\n${label}\n${decoded}`);
    } catch (err) {
      console.error("❌ Transcription error:", err);
      setTranscript(prev => prev + `\n\n⚠️ Error retrieving feedback.`);
    }
  }

  function handleFinal() {
    console.log("✅ Final triggered");
    recordingFinalNow.current = true;

    if (vadInstanceRef.current?.stop) {
      vadInstanceRef.current.stop();
      console.log("🎤 VAD successfully stopped after Final");
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      console.warn("⚠️ No active recording; capturing short final clip");
      startFinalRecording();
    }
  }

  function startFinalRecording() {
    chunkBufferRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: 'audio/webm;codecs=opus',
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunkBufferRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      if (chunkBufferRef.current.length === 0) {
        console.warn("⚠️ No audio recorded, skipping submission.");
        return;
      }

      const blob = new Blob(chunkBufferRef.current, { type: 'audio/webm' });
      sendToTranscription(blob, 'verbal-final.webm');
    };

    mediaRecorderRef.current = recorder;
    recorder.start();

    setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, 3000);
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

export default VerbalStage;
