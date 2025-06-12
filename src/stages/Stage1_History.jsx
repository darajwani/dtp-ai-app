import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Stage1_History() {
  const navigate = useNavigate();
  const [scenarioId] = useState('DTP-001'); // You can make this dynamic later
  const [inputText, setInputText] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [timerId, setTimerId] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setShowTimeUp(true);
      setTimeout(() => navigate('/stage2'), 1000); // Redirect after message
    }, 10 * 60 * 1000); // 10 minutes
    setTimerId(id);

    return () => {
      clearTimeout(id);
    };
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const formData = new FormData();
    formData.append('scenarioId', scenarioId);
    formData.append('transcript', inputText);

    // Show in chat log (You)
    setChatLog((prev) => [...prev, { role: 'you', text: inputText }]);
    setInputText('');

    // Debug log
    for (let pair of formData.entries()) {
      console.log(`${pair[0]}:`, pair[1]);
    }

    try {
      const res = await fetch('https://hook.eu2.make.com/crk1ln2mgic8nkj5ey5eoxij9p1l7c1e', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.reply) {
        setChatLog((prev) => [...prev, { role: 'patient', text: data.reply }]);
      } else {
        setChatLog((prev) => [...prev, { role: 'system', text: 'No reply from AI.' }]);
      }
    } catch (err) {
      console.error('Error sending to Make:', err);
      setChatLog((prev) => [...prev, { role: 'system', text: 'Error contacting server.' }]);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">🟦 Stage 1 – History Taking</h1>
      <p className="mb-4 text-gray-700">This is a test chat to verify scenario ID routing.</p>

      {showTimeUp && (
        <div className="text-red-600 font-bold mb-4">⏰ Time's Up! Moving to Stage 2...</div>
      )}

      <div className="border p-4 rounded h-64 overflow-y-auto bg-gray-50 mb-4">
        {chatLog.length === 0 && <p className="text-gray-400">Chat will appear here...</p>}
        {chatLog.map((msg, index) => (
          <div key={index} className="mb-2">
            <strong>{msg.role === 'you' ? 'You' : msg.role === 'patient' ? 'Patient' : 'System'}:</strong>{' '}
            {msg.text}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a question..."
          className="flex-grow border rounded px-3 py-2"
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
