import { useEffect, useRef, useState } from 'react';

function VerbalStage({ onStationComplete }) {
  const [transcript, setTranscript] = useState('');
  const [micActive, setMicActive] = useState(false);
  const [timer, setTimer] = useState(600);
  const [showCompleteBtn, setShowCompleteBtn] = useState(false);

  const mediaRecorderRef = useRef();
  const streamRef = useRef();
  const chunkBufferRef = useRef([]);
  const allChunksRef = useRef([]);
  const recordingFinalNow = useRef(false);
  const recordingEndedRef = useRef(false);
  const vadRef = useRef();
  const timerRef = useRef();

  useEffect(() => {
    async function initVAD() {
      const vad = window.vad || window;
      if (!vad?.MicVAD) return console.error("❌ MicVAD missing");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const vadInst = await vad.MicVAD.new({
        onSpeechStart: () => {
          if (recordingEndedRef.current) return;
          handleSpeechStart(stream);
        },
        onSpeechEnd: handleSpeechEnd,
        modelURL: '/vad/silero_vad.onnx',
        throttleTime: 200,
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.3,
      });
      vadRef.current = vadInst;
      await vadInst.start();

      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleFinal();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    if (!recordingEndedRef.current) initVAD();

    return () => {
      vadRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      clearInterval(timerRef.current);
    };
  }, []);

  function handleSpeechStart(stream) {
    console.log("🗣️ Speech start");
    if (mediaRecorderRef.current?.state === 'recording') return;
    chunkBufferRef.current = [];
    setMicActive(true);

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    recorder.ondataavailable = e => e.data.size && chunkBufferRef.current.push(e.data);
    recorder.onstop = handleRecorderStop;
    mediaRecorderRef.current = recorder;
    recorder.start();
  }

  function handleSpeechEnd() {
    console.log("🔇 Speech end");
    if (mediaRecorderRef.current?.state === 'recording') {
      setTimeout(() => mediaRecorderRef.current?.state === 'recording' && mediaRecorderRef.current.stop(), 300);
    }
  }

  async function handleRecorderStop() {
    setMicActive(false);
    if (!chunkBufferRef.current.length) return;

    const blob = new Blob(chunkBufferRef.current, { type: 'audio/webm' });
    if (!recordingFinalNow.current) allChunksRef.current.push(blob);

    const filename = recordingFinalNow.current ? 'verbal-final.webm' : 'verbal-fragment.webm';
    console.log(`📤 Sending file: ${filename}`);

    if (!recordingEndedRef.current || recordingFinalNow.current) {
      await sendToTranscription(blob, filename);
    }

    if (recordingFinalNow.current) {
      recordingEndedRef.current = true;
      recordingFinalNow.current = false;
      vadRef.current?.stop();
      console.log("🎤 VAD stopped after final");
    }
  }

  async function sendToTranscription(blob, filename) {
    const form = new FormData();
    form.append('file', blob, filename);
    form.append('sessionId', 'abc123');
    form.append('role', 'student');
    form.append('final', recordingFinalNow.current ? 'true' : 'false');

    try {
      const res = await fetch('https://hook.eu2.make.com/…', { method: 'POST', body: form });
      console.log("✅ sent", res.status);
      const json = await res.json();
      console.log("📦 res", json);

      if (json.completed) {
        console.log("✅ final done");
        setTranscript(`🟢 Final Feedback:\n${json.reply}`);
        setShowCompleteBtn(true);
        return;
      }

      const label = json.route === 'long' ? '🟢 Final Feedback:' : '📋 Feedback:';
      setTranscript(prev => prev + `\n\n${label}\n${json.reply}`);
    } catch (e) {
      console.error("❌ error", e);
      setTranscript(prev => prev + "\n\n⚠️ Error retrieving feedback.");
    }
  }

  function handleFinal() {
    console.log("✅ Final triggered");
    recordingFinalNow.current = true;
    mediaRecorderRef.current?.state === 'recording'
      ? mediaRecorderRef.current.stop()
      : (allChunksRef.current.length
          ? (vadRef.current?.stop(), mediaRecorderRef.current?.stop())
          : alert("⚠️ No audio"));
  }

  const mm = String(Math.floor(timer / 60)).padStart(2, '0');
  const ss = String(timer % 60).padStart(2, '0');

  return (
    <div>
      <h2>Stage 4 – Verbal Presentation</h2>
      {!recordingEndedRef.current && (
        <div>
          <div>{micActive ? "🎙️ Listening…" : "Waiting…"}</div>
          <div>⏳ {mm}:{ss}</div>
          <button onClick={() => mediaRecorderRef.current?.stop()}>Force Stop</button>
          <button onClick={handleFinal}>Send as Final</button>
        </div>
      )}
      {transcript && <pre>{transcript}</pre>}
      {showCompleteBtn && (
        <button onClick={() => onStationComplete?.() || window.location.href = '/feedback'}>
          ✅ Go to Feedback Page
        </button>
      )}
    </div>
  );
}

export default VerbalStage;
