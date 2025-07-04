import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HistoryInterview({ sessionId, scenarioId }) {
  const [chatLog, setChatLog] = useState([]);
  const [micActive, setMicActive] = useState(false);
  const [timer, setTimer] = useState(780);
  const [discussedIntents, setDiscussedIntents] = useState([]);
  const [pcIndex, setPcIndex] = useState(0);
  const sessionEndedRef = useRef(false);

  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunkBufferRef = useRef([]);
  const vadInstanceRef = useRef(null);
  const timerRef = useRef(null);
  const isWaitingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const audioQueueRef = useRef([]);
  const discussedIntentsRef = useRef([]);
  const pcIndexRef = useRef(0);
  const navigate = useNavigate();

  const transcriptWebhookURL = 'https://hook.eu2.make.com/ahtfo1phr8gpc6wlfwpvz22pqasicmxn';

  useEffect(() => {
    async function startVAD() {
      const vad = window?.vad || window;
      if (!vad?.MicVAD) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const vadInstance = await vad.MicVAD.new({
        onSpeechStart: () => {
          if (sessionEndedRef.current) return;

          chunkBufferRef.current = [];
          setMicActive(true);

          const recorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus',
          });

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunkBufferRef.current.push(e.data);
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
          if (sessionEndedRef.current) return;
          setTimeout(() => {
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
          }, 500);
        },

        modelURL: '/vad/silero_vad.onnx',
        throttleTime: 400,
        positiveSpeechThreshold: 0.6,
        negativeSpeechThreshold: 0.2,
      });

      vadInstanceRef.current = vadInstance;
      await vadInstance.start();

      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            sessionEndedRef.current = true;
            clearInterval(timerRef.current);

            if (vadInstanceRef.current && typeof vadInstanceRef.current.stop === 'function') {
              vadInstanceRef.current.stop();
            }

            if (streamRef.current && streamRef.current.getTracks) {
              streamRef.current.getTracks().forEach((track) => track.stop());
            }

            const payload = {
              sessionId,
              scenarioId,
              pc_index: pcIndexRef.current,
              context: discussedIntentsRef.current.join(','),
              timestamp: new Date().toISOString(),
            };

            console.log("📤 Sending transcript trigger:", payload);

            fetch(transcriptWebhookURL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
              .then(() => {
                console.log("✅ Transcript webhook triggered");
                navigate(`/stage2?caseId=${scenarioId}`);
              })
              .catch((err) => {
                console.error("❌ Failed to send transcript trigger:", err);
                navigate(`/stage2?caseId=${scenarioId}`);
              });

            return 0;
          }

          return prev - 1;
        });
      }, 1000);
    }

    startVAD();

    return () => {
      if (vadInstanceRef.current && typeof vadInstanceRef.current.stop === 'function') {
        vadInstanceRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      clearInterval(timerRef.current);
    };
  }, [navigate, scenarioId, sessionId]);

  async function sendToAI(blob) {
    if (isWaitingRef.current || sessionEndedRef.current) return;
    isWaitingRef.current = true;

    const formData = new FormData();
    formData.append('file', blob, 'question.webm');
    formData.append('scenarioId', scenarioId);
    formData.append('sessionId', sessionId);
    formData.append('pc_index', pcIndexRef.current);

    const context = discussedIntentsRef.current.join(',');
    if (context) formData.append('context', context);

    try {
      const res = await fetch('https://hook.eu2.make.com/5spyouenv7ty28um9jojr6il1xy8isg7', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      const aiReply = json.reply || '[No reply]';

      setChatLog((prev) => [...prev, `🧑‍⚕️ You: (Your question)`, `🦷 Patient: ${aiReply}`]);
      queueAndSpeakReply(aiReply);

      if (json.intent && !discussedIntentsRef.current.includes(json.intent)) {
        const updated = [...discussedIntentsRef.current, json.intent];
        discussedIntentsRef.current = updated;
        setDiscussedIntents(updated);
      }

      if (json.intent === 'ask_other_complaints') {
        const newIndex = pcIndexRef.current + 1;
        pcIndexRef.current = newIndex;
        setPcIndex(newIndex);
      }

    } catch (err) {
      console.error("❌ AI error:", err);
      setChatLog((prev) => [...prev, "⚠️ Could not contact AI"]);
    } finally {
      isWaitingRef.current = false;
    }
  }

  function queueAndSpeakReply(text) {
    if (sessionEndedRef.current) return;
    audioQueueRef.current.push(text);
    if (!isSpeakingRef.current) playNextInQueue();
  }

  function playNextInQueue() {
    if (sessionEndedRef.current || audioQueueRef.current.length === 0) {
      isSpeakingRef.current = false;
      return;
    }

    const text = audioQueueRef.current.shift();
    isSpeakingRef.current = true;

    fetch('/.netlify/functions/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then((res) => res.json())
      .then((data) => {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audio.play().catch(console.warn);
        audio.onended = () => {
          isSpeakingRef.current = false;
          playNextInQueue();
        };
      })
      .catch((err) => {
        console.error("🔊 TTS error:", err);
        isSpeakingRef.current = false;
      });
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
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <span>Mic status: {micActive ? '🎙️ Listening...' : 'Idle'}</span>
        <span className={`w-3 h-3 rounded-full ${micActive ? 'bg-red-500 animate-ping' : 'bg-gray-300'}`} />
      </div>
    </div>
  );
}
