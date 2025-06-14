import { useEffect, useRef, useState } from 'react';

function VerbalStage() {
  const [transcript, setTranscript] = useState('');
  const [micActive, setMicActive] = useState(false);
  const [timer, setTimer] = useState(600); // 10 minute timer
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunkBufferRef = useRef([]);
  const allChunksRef = useRef([]);
  const recordingFinalNow = useRef(false);
  const recordingEndedRef = useRef(false);
  const vadInstanceRef = useRef(null);
  const timerIntervalRef = useRef(null);

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
          if (recordingEndedRef.current) return;
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

            if (!recordingFinalNow.current) {
              allChunksRef.current.push(blob);
            }

            const filename = recordingFinalNow.current ? 'verbal-final.webm' : 'verbal-fragment.webm';
            console.log(`📤 Sending file: ${filename}`);

            if (!recordingEndedRef.current || recordingFinalNow.current) {
              sendToTranscription(blob, filename);
            }

            if (recordingFinalNow.current) {
              if (vadInstanceRef.current?.stop) vadInstanceRef.current.stop();
              console.log("🎤 VAD stopped after final speech ended");
              recordingEndedRef.current = true;
              recordingFinalNow.current = false;
            }
          };

          mediaRecorderRef.current = recorder;
          recorder.start();
        },
        onSpeechEnd: () => {
          console.log("🔇 Speech ended.");
          if (mediaRecorderRef.current?.state === 'recording') {
            setTimeout(() => {
              if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
              }
            }, 300);
          }
        },
        modelURL: '/vad/silero_vad.onnx',
        throttleTime: 200,
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.3,
      });

      vadInstanceRef.current = vadInstance;
      await vadInstance.start();

      // Start countdown timer
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            handleFinal();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    startVAD();

    return () => {
      if (vadInstanceRef.current?.stop) vadInstanceRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      clearInterval(timerIntervalRef.current);
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
        console.error("❌ No 'reply' field in response for file:", filename);
        const label = filename === 'verbal-final.webm' ? '🟢 Final Feedback:' : '📋 Feedback:';
        const fallbackReplies = ["Okay.", "Got it.", "Sure.", "Alright.", "Noted."];
        const randomShort = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
        setTranscript(prev => prev + `\n\n${label}\n${randomShort}`);
        return;
      }

      let decoded = json.reply.trim();
      try {
        const decodedCandidate = atob(decoded);
        const isMostlyText = /^[\x20-\x7E\r\n\t]+$/.test(decodedCandidate.trim());
        if (isMostlyText) {
          decoded = decodedCandidate.trim();
          console.log("🧪 Base64 decoded reply:", decoded);
        } else {
          console.log("🧾 Using original reply (not cleanly decodable)");
        }
      } catch {
        console.log("🧾 Not Base64 or failed decoding, using raw reply");
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

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      if (allChunksRef.current.length > 0) {
        const finalBlob = new Blob(allChunksRef.current, { type: 'audio/webm' });
        sendToTranscription(finalBlob, 'verbal-final.webm');
        recordingEndedRef.current = true;
        if (vadInstanceRef.current?.stop) vadInstanceRef.current.stop();
        console.log("📤 Final combined audio sent (no live speech)");
      } else {
        alert("⚠️ No audio detected to send as final.");
      }
    }
  }

  const minutes = Math.floor(timer / 60).toString().padStart(2, '0');
  const seconds = (timer % 60).toString().padStart(2, '0');

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 to-white p-6 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl p-6 space-y-6">
        <h2 className="text-3xl font-bold text-yellow-800 flex items-center gap-2">
          <span role="img" aria-label="stage">🟡</span> Stage 4 – Verbal Presentation
        </h2>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${micActive ? 'bg-red-500 animate-ping' : 'bg-gray-300'}`}></div>
            <p className="text-lg">{micActive ? '🎙️ Listening… Speak now' : 'Waiting for speech…'}</p>
          </div>
          <div className="text-sm text-gray-500 font-mono">
            ⏳ {minutes}:{seconds}
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => {
              if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
                console.log("⏹️ Force stop triggered");
              }
            }}
            className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded shadow"
          >
            ⏹️ Force Stop
          </button>
          <button
            onClick={handleFinal}
            className="bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded shadow"
          >
            📤 Send as Final (Test)
          </button>
        </div>

        {transcript && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">📝 Transcript / Feedback</h3>
            <pre className="whitespace-pre-wrap break-words text-gray-700 text-base leading-relaxed">{transcript}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerbalStage;
