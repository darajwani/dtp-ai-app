import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HistoryInterview({ sessionId, scenarioId }) {
  const [chatLog, setChatLog] = useState([]);
  const [micActive, setMicActive] = useState(false);
  const [timer, setTimer] = useState(10); // ⏱️ Adjust for testing
  const [discussedIntents, setDiscussedIntents] = useState([]);
  const [pcIndex, setPcIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

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
  const feedbackTriggerURL = 'https://hook.eu2.make.com/clav842drbatiwo4uyp1jf512r1c3tm4';
  const feedbackFetchURL = 'https://hook.eu2.make.com/clav842drbatiwo4uyp1jf512r1c3tm4';

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

            if (vadInstanceRef.current?.stop) vadInstanceRef.current.stop();
            streamRef.current?.getTracks().forEach((track) => track.stop());

            const payload = {
              sessionId,
              scenarioId,
              pc_index: pcIndexRef.current,
              context: discussedIntentsRef.current.join(','),
              timestamp: new Date().toISOString(),
            };

            fetch(transcriptWebhookURL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
              .then(() => console.log("✅ Transcript webhook triggered"))
              .catch((err) => console.error("❌ Transcript trigger failed:", err));

            return 0;
          }

          return prev - 1;
        });
      }, 1000);
    }

    startVAD();

    return () => {
      vadInstanceRef.current?.stop?.();
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
  if (audioQueueRef.current.length === 0) {
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
    .then(res => res.json())
    .then(data => {
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      audio.play().catch(console.warn);
      audio.onended = () => {
        isSpeakingRef.current = false;
        playNextInQueue();
      };
    })
    .catch(err => {
      console.error("🔊 TTS error:", err);
      isSpeakingRef.current = false;
    });
}


  async function generateFeedback() {
    setIsGeneratingFeedback(true);
    setFeedback(null);

    try {
      await fetch(feedbackTriggerURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, scenarioId }),
      });

      console.log("⏳ Waiting 20s for feedback to be ready...");
      await new Promise((resolve) => setTimeout(resolve, 20000));

      const res = await fetch(`${feedbackFetchURL}?sessionId=${sessionId}`);
      const data = await res.json();
      setFeedback(data);
    } catch (err) {
      console.error("❌ Feedback fetch failed:", err);
      setFeedback({ plain_summary: 'Failed to load feedback.' });
    } finally {
      setIsGeneratingFeedback(false);
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

      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
        <span>Mic status: {micActive ? '🎙️ Listening...' : 'Idle'}</span>
        <span className={`w-3 h-3 rounded-full ${micActive ? 'bg-red-500 animate-ping' : 'bg-gray-300'}`} />
      </div>

      <button
        onClick={generateFeedback}
        disabled={isGeneratingFeedback}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {isGeneratingFeedback ? 'Generating Feedback…' : 'Generate Feedback'}
      </button>

      {feedback && (
        <div className="mt-4 p-4 border rounded bg-green-50 text-green-800">
          <h2 className="font-semibold mb-2">📝 Feedback Summary</h2>
          <p><strong>Grade:</strong> {feedback.grade}</p>
          <p><strong>Score:</strong> {feedback.score}</p>
          <p><strong>Summary:</strong> {feedback.summary}</p>
          <p><strong>Detailed Feedback:</strong> {feedback.feedback}</p>
          <p><strong>Questions Asked:</strong> {feedback.questions_asked}</p>
          <p><strong>Questions Missed:</strong> {feedback.questions_missed}</p>
          <p><strong>Plain Summary:</strong> {feedback.plain_summary}</p>
          <h3 className="mt-2 font-semibold">Rubric Summary:</h3>
          <ul className="list-disc ml-5">
            {feedback.rubric_summary &&
              Object.entries(feedback.rubric_summary).map(([key, value]) => (
                <li key={key}>{key}: {value}</li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
