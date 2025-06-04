// src/components/VerbalStage.jsx
import { useEffect, useRef, useState } from 'react';

export default function VerbalStage() {
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [micActive, setMicActive] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunkBufferRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    async function startVAD() {
      const vad = window?.vad || window;
      if (!vad || !vad.MicVAD) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const myvad = await vad.MicVAD.new({
        onSpeechStart: () => {
          setMicActive(true);
          chunkBufferRef.current = [];

          const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
          mediaRecorderRef.current = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunkBufferRef.current.push(e.data);
            }
          };
          recorder.onstop = () => {
            const blob = new Blob(chunkBufferRef.current, { type: 'audio/webm' });
            sendToMakeWebhook(blob);
          };
          recorder.start();
        },
        onSpeechEnd: () => {
          setMicActive(false);
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        },
        modelURL: '/vad/silero_vad.onnx',
      });

      myvad.start();
    }

    startVAD();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  async function sendToMakeWebhook(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'verbal-fragment.webm');

    try {
      const res = await fetch('https://hook.eu2.make.com/crk1ln2mgic8nkj5ey5eoxij9p1l7c1e', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      // Update transcript
      if (json.transcript) {
        setTranscript((prev) => (prev ? prev + '\n' + json.transcript : json.transcript));
      }

      // Decode base64 feedback
      if (json.feedback) {
        const decoded = atob(json.feedback);
        setFeedback(decoded.trim());
      }
    } catch (err) {
      console.error('Error during transcription/feedback:', err);
    }
  }

  return (
    <div className="bg-yellow-100 min-h-screen p-6 space-y-6">
      <h2 className="text-2xl font-bold text-yellow-800">🟡 Stage 4 – Verbal Presentation</h2>

      <div className="flex items-center space-x-3">
        <div className={`w-4 h-4 rounded-full ${micActive ? 'bg-red-500 animate-ping' : 'bg-gray-300'}`}></div>
        <p>{micActive ? '🎙️ Voice detected. AI is listening…' : 'Waiting for speech…'}</p>
      </div>

      {transcript && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">📝 Live Transcript</h3>
          <pre className="whitespace-pre-wrap text-gray-800">{transcript}</pre>
        </div>
      )}

      {feedback && (
        <div className="bg-white p-4 rounded shadow border border-yellow-300">
          <h3 className="font-semibold mb-2 text-yellow-700">✅ AI Feedback</h3>
          <p className="text-gray-800 whitespace-pre-wrap">{feedback}</p>
        </div>
      )}
    </div>
  );
}
