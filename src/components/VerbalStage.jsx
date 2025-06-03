// src/components/VerbalStage.jsx
import { useState } from 'react'

export default function VerbalStage() {
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  async function startVerbalRecording() {
    setIsRecording(true);
    setFeedback('');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const recorder = new MediaRecorder(stream);
    const chunks = [];

    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = async () => {
      setIsProcessing(true);
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', blob, 'verbal.webm');

      // Whisper transcription via Make.com hook (change URL to yours)
      const res = await fetch('https://hook.eu2.make.com/gotjtejc6e7anjxxikz5fciwcl1m2nj2', {
        method: 'POST',
        body: formData
      });

      const json = await res.json();
      const rawText = atob(json.reply);
      const decodedText = new TextDecoder('utf-8').decode(Uint8Array.from(rawText, c => c.charCodeAt(0))).trim();
      setTranscript(decodedText);
      generateFeedback(decodedText);
      setIsProcessing(false);
    }

    recorder.start();
    setTimeout(() => {
      recorder.stop();
      stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }, 60000); // 1 minute limit
  }

  async function generateFeedback(text) {
    const prompt = `You are a DTP exam examiner. A student just verbally presented their full treatment plan: \n\n"${text}"\n\nPlease evaluate this using the following criteria:\n- Did they cover all 4 treatment phases?\n- Was the justification logical and complete?\n- Were communication and structure clear?\n- Confidence of presentation?\n
Return structured feedback.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4
      })
    });

    const data = await res.json();
    setFeedback(data.choices?.[0]?.message?.content || 'No feedback received');
  }

  return (
    <div className="bg-yellow-100 min-h-screen p-6 space-y-6">
      <h2 className="text-2xl font-bold text-yellow-800">🟡 Stage 4 – Verbal Presentation</h2>

      <button
        onClick={startVerbalRecording}
        disabled={isRecording || isProcessing}
        className="bg-yellow-600 text-white px-6 py-2 rounded"
      >
        {isRecording ? 'Recording...' : '🎤 Start Recording'}
      </button>

      {transcript && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">📝 Transcript</h3>
          <p>{transcript}</p>
        </div>
      )}

      {isProcessing && <p>🕒 Processing audio and generating feedback...</p>}

      {feedback && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">✅ AI Feedback</h3>
          <pre className="whitespace-pre-wrap text-gray-800">{feedback}</pre>
        </div>
      )}
    </div>
  );
}
