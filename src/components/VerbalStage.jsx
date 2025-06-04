// src/components/VerbalStage.jsx
import { useEffect, useRef, useState } from 'react';

export default function VerbalStage() {
  const [micActive, setMicActive] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const vadRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const startSession = async () => {
      const vad = window?.vad || window;
      if (!vad || !vad.MicVAD) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      vadRef.current = await vad.MicVAD.new({
        onSpeechStart: () => {
          if (recordingComplete) return;

          setMicActive(true);

          const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
          mediaRecorderRef.current = recorder;
          const chunkList = [];

          recorder.ondataavailable = e => {
            if (e.data.size > 0) chunkList.push(e.data);
          };

          recorder.onstop = () => {
            const combinedBlob = new Blob(chunkList, { type: 'audio/webm' });
            audioChunksRef.current.push(combinedBlob);
          };

          recorder.start();
        },

        onSpeechEnd: () => {
          if (recordingComplete) return;
          setMicActive(false);
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        },

        modelURL: '/vad/silero_vad.onnx'
      });

      vadRef.current.start();

      // ⏱ Automatically end session after 10 minutes
      timeoutRef.current = setTimeout(() => {
        endSession();
      }, 10 * 60 * 1000); // 10 minutes
    };

    startSession();

    return () => {
      vadRef.current?.pause();
      streamRef.current?.getTracks().forEach(t => t.stop());
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const endSession = () => {
    setRecordingComplete(true);
    vadRef.current?.pause();
    streamRef.current?.getTracks().forEach(t => t.stop());

    const finalBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    sendToTranscription(finalBlob);
  };

  async function sendToTranscription(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'full-session.webm');

    try {
      const res = await fetch('https://hook.eu2.make.com/crk1ln2mgic8nkj5ey5eoxij9p1l7c1e', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      const base64 = json.reply;
      const decodedText = new TextDecoder().decode(
        Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      ).trim();

      setTranscript(decodedText);
    } catch (err) {
      console.error('Transcription error:', err);
    }
  }

  return (
    <div className="bg-yellow-100 min-h-screen p-6 space-y-6">
      <h2 className="text-2xl font-bold text-yellow-800">🟡 Stage 4 – Verbal Presentation</h2>

      <div className="flex items-center space-x-3">
        <div className={`w-4 h-4 rounded-full ${micActive ? 'bg-red-500 animate-ping' : 'bg-gray-300'}`}></div>
        <p>{micActive ? '🎙️ AI is listening to your presentation…' : recordingComplete ? 'Session complete. Generating feedback…' : 'Waiting for voice…'}</p>
      </div>

      {transcript && (
        <div className="bg-white p-4 rounded shadow mt-6">
          <h3 className="font-semibold mb-2">✅ AI Feedback on Your DTP Presentation</h3>
          <pre className="whitespace-pre-wrap text-gray-800">{transcript}</pre>
        </div>
      )}
    </div>
  );
}
