
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Stage1_History() {
  const navigate = useNavigate();
  const [scenarioId] = useState('DTP-001');
  const [inputText, setInputText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [timerId, setTimerId] = useState(null);
  const [showTimeUp, setShowTimeUp] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setShowTimeUp(true);
      setTimeout(() => navigate('/stage2'), 2000);
    }, 10 * 60 * 1000);
    setTimerId(id);
    return () => clearTimeout(id);
  }, [navigate]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const formData = new FormData();
    formData.append('scenarioId', scenarioId);
    formData.append('transcript', inputText);

    console.log('Sending form data...');
    for (let pair of formData.entries()) {
      console.log(pair[0] + ': ' + pair[1]);
    }

    try {
      const res = await fetch('https://hook.eu2.make.com/crk1ln2mgic8nkj5ey5eoxij9p1l7c1e', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      console.log('Response from Make:', data);

      const aiReply = data.reply || '[No reply from AI]';

      setChatLog(prev => [...prev, { role: 'You', text: inputText }, { role: 'Patient', text: aiReply }]);
      setInputText('');
      setResponseText(aiReply);
    } catch (err) {
      console.error('Fetch error:', err);
      setChatLog(prev => [...prev, { role: 'System', text: '❌ Error contacting server.' }]);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🦷 DTP Case 1 Simulation</h1>

      {showTimeUp && <div className="text-red-600 font-bold mb-4">⏰ Time's Up! Proceeding to Stage 2...</div>}

      <div className="border p-4 mb-4 rounded bg-gray-100 h-60 overflow-y-auto">
        {chatLog.length === 0 ? (
          <p className="text-gray-500">Start your conversation with the patient...</p>
        ) : (
          chatLog.map((msg, i) => (
            <div key={i} className="mb-2">
              <strong>{msg.role}:</strong> {msg.text}
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a question..."
          className="border px-3 py-2 rounded w-full"
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>

      <button
        onClick={() => navigate('/stage2')}
        className="bg-gray-700 text-white px-4 py-2 rounded"
      >
        Proceed to Orange Stage
      </button>
    </div>
  );
}
