// src/components/VerbalStage.jsx
import { useEffect, useRef, useState } from 'react';

export default function VerbalStage() {
  const [transcript, setTranscript] = useState('');
  const [micActive, setMicActive] = useState(false);
  const [feedback, setFeedback] = useState('');
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
          console.log("Speech started");
          setMicActive(true);
          chunkBufferRef.current = [];

          const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
          mediaRecorderRef.current = recorder;
          recorder.ondataavailable = e => e.data.size > 0 && chunkBufferRef.current.push(e.data);
          recorder.onstop = () => {
            const blob = new Blob(chunkBufferRef.current, { type: 'audio/webm' });
            sendToTranscription(blob);
          };
          recorder.start();
        },
        onSpeechEnd: () => {
          console.log("Speech ended");
          setMicActive(false);
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        },
        modelURL: '/vad/silero_vad.onnx'
      });

      myvad.start();
    }

    startVAD();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  async function sendToTranscription(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'verbal-fragment.webm');

    try {
      const res = await fetch('https://hook.eu2.make.com/crk1ln2mgic8nkj5ey5eoxij9p1l7c1e', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      const rawText = atob(json.reply);
      const decodedText = new TextDecoder('utf-8').decode(Uint8Array.from(rawText, c => c.charCodeAt(0))).trim();
      const fullTranscript = transcript + '\n' + decodedText;
      setTranscript(fullTranscript);
      getGPTFeedback(fullTranscript); // ⬅️ Trigger feedback after each chunk
    } catch (err) {
      console.error('Transcription error:', err);
    }
  }

  async function getGPTFeedback(text) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer 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',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a dental OSCE examiner.' },
            {
              role: 'user',
              content: `The student said:\n\n"${text}"\n\nPlease score this verbal DTP presentation from 0 to 10 and give short feedback.`
            }
          ]
        })
      });

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'No feedback received.';
      setFeedback(reply);
    } catch (err) {
      console.error('GPT feedback error:', err);
      setFeedback('⚠️ Failed to retrieve feedback.');
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
