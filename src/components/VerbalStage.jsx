// src/components/VerbalStage.jsx
import { useEffect, useState } from 'react';

export default function VerbalStage() {
  const [transcript, setTranscript] = useState('');
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [lastSentTime, setLastSentTime] = useState(0);
  const [micActive, setMicActive] = useState(false);

  useEffect(() => {
    async function initRecording() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      const chunkBuffer = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) {
          chunkBuffer.push(e.data);
          setChunks([...chunkBuffer]);
        }
      };

      recorder.start(3000); // collect small chunks every 3s
      setMicActive(true);

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        setMicActive(false);
      };
    }

    initRecording();
  }, []);

  useEffect(() => {
    if (!mediaRecorder) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (chunks.length > 0 && now - lastSentTime > 10000) {
        sendAudioToTranscription(new Blob(chunks, { type: 'audio/webm' }));
        setChunks([]);
        setLastSentTime(now);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [chunks, lastSentTime, mediaRecorder]);

  async function sendAudioToTranscription(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'verbal-fragment.webm');

    try {
      const res = await fetch('https://hook.eu2.make.com/gotjtejc6e7anjxxikz5fciwcl1m2nj2', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      const rawText = atob(json.reply);
      const decodedText = new TextDecoder('utf-8').decode(Uint8Array.from(rawText, c => c.charCodeAt(0))).trim();
      setTranscript(prev => prev + '\n' + decodedText);
    } catch (err) {
      console.error('Transcription error:', err);
    }
  }

  return (
    <div className="bg-yellow-100 min-h-screen p-6 space-y-6">
      <h2 className="text-2xl font-bold text-yellow-800">🟡 Stage 4 – Verbal Presentation</h2>

      {micActive && (
        <div className="flex items-center space-x-3">
          <div className={`w-4 h-4 rounded-full ${micActive ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
          <p>🎙️ Voice is being monitored. Speak your treatment plan clearly.</p>
        </div>
      )}

      {transcript && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">📝 Live Transcript</h3>
          <pre className="whitespace-pre-wrap text-gray-800">{transcript}</pre>
        </div>
      )}
    </div>
  );
}
