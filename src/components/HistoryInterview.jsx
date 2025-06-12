import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HistoryInterview() {
  const [chatLog, setChatLog] = useState([]);
  const [micActive, setMicActive] = useState(false);
  const [timer, setTimer] = useState(600); // 10 minutes
  const scenarioId = 'DTP-001';
  const navigate = useNavigate();

  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunkBufferRef = useRef([]);
  const vadInstanceRef = useRef(null);
  const timerRef = useRef(null);

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
            const blob = new Blob(chunkBufferRef.current, { type: 'audio/webm' });
            sendToAI(blob);
          };

          mediaRecorderRef.current = recorder;
          recorder.start();
        },
        onSpeechEnd: () => {
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

      // Auto-stage transition timer
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            vadInstance.stop();
            stream.getTracks().forEach(track => track.stop());
            navigate('/stage2');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    startVAD();

    return () => {
      vadInstanceRef.current?.stop?.();
      streamRef.current?.getTracks().forEach(track => track.stop());
      clearInterval(timerRef.current);
    };
  }, [navigate]);

  async function sendToAI(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'question.webm');
    formData.append('scenarioId', scenarioId);

    try {
      const res = await fetch('https://hook.eu2.make.com/crk1ln2mgic8nkj5ey5eoxij9p1l7c1e', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      const aiReply = json.reply || '[No reply received]';
      setChatLog(prev => [...prev, `🧑‍⚕️ You: (Your question)`, `🦷 Patient: ${aiReply}`]);
      speakText(aiReply);
    } catch (err) {
      console.error("❌ AI fetch error:", err);
      setChatLog(prev => [...prev, "⚠️ Error: could not reach AI"]);
    }
  }

  async function speakText(text) {
    try {
      const res = await fetch('/.netlify/functions/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      new Audio(url).play();
    } catch (err) {
      console.error("🔊 TTS error:", err);
    }
  }

  const minutes = String(Math.floor(timer / 60)).padStart(2, '0');
  const seconds = String(timer % 60).padStart(2, '0');

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🟦 Stage 1 – History Taking</h1>
      <p className="text-gray-500 text-sm mb-2">Time left: ⏱️ {minutes}:{seconds}</p>
      <div className="border bg-gray-100 p-4 h-64 overflow-y-auto mb-4 rounded">
        {chatLog.length === 0
          ? <p className="text-gray-400">🎤 Start speaking to begin the patient interview…</p>
          : chatLog.map((line, i) => <div key={i} className="mb-2">{line}</div>)
        }
      </div>
      <p className="text-sm text-gray-600">Mic status: {micActive ? '🎙️ Listening...' : 'Idle'}</p>
    </div>
  );
}
