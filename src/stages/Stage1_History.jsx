import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useVAD from '../vadHandler'; // Copy from Stage 4
import { speakText } from '../ttsHandler'; // Copy from OSCE module

export default function Stage1_History() {
  const navigate = useNavigate();
  const [scenarioId, setScenarioId] = useState('DTP-001');
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [timerId, setTimerId] = useState(null);

  const onSpeechEnd = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'question.wav');
    formData.append('scenarioId', scenarioId);

    try {
      const res = await fetch('https://hook.make.com/YOUR_WEBHOOK_URL', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.reply) speakText(data.reply);
    } catch (err) {
      console.error('Error fetching AI reply:', err);
    }
  };

  const { startVAD, stopVAD, resetVAD } = useVAD(onSpeechEnd);

  useEffect(() => {
    startVAD();
    const id = setTimeout(() => {
      setShowTimeUp(true);
      setTimeout(() => navigate('/stage2'), 1000);
    }, 10 * 60 * 1000);
    setTimerId(id);
    return () => {
      stopVAD();
      clearTimeout(id);
    };
  }, []);

  const handleTest = () => {
    const fakeForm = new FormData();
    fakeForm.append('scenarioId', scenarioId);
    fakeForm.append('transcript', 'Do you smoke?');

    fetch('https://hook.make.com/YOUR_WEBHOOK_URL', {
      method: 'POST',
      body: fakeForm,
    })
      .then((res) => res.json())
      .then((data) => data.reply && speakText(data.reply))
      .catch((err) => console.error('Test error:', err));
  };

  const handleStop = () => {
    resetVAD();
    clearTimeout(timerId);
    navigate('/stage1');
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">🟦 Stage 1 – History Taking</h1>
      {showTimeUp && <div className="text-red-600 font-bold mb-4">⏰ Time's Up!</div>}
      <div className="flex gap-4">
        <button onClick={handleTest} className="bg-blue-500 text-white px-4 py-2 rounded">Test</button>
        <button onClick={handleStop} className="bg-red-500 text-white px-4 py-2 rounded">Stop & Restart</button>
      </div>
    </div>
  );
}
