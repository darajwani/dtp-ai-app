import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function CaseSelection({ onStart }) {
  const [selectedCase, setSelectedCase] = useState('');

  const handleStart = () => {
    if (!selectedCase) return alert('Please select a case.');
    const sessionId = uuidv4();
    onStart({ scenarioId: selectedCase, sessionId });
  };

  return (
    <div className="p-10 min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">🧪 Select a Case</h1>

      <select
        value={selectedCase}
        onChange={(e) => setSelectedCase(e.target.value)}
        className="border p-2 rounded mb-4 block"
      >
        <option value="">-- Choose Case --</option>
        <option value="DTP-001">DTP-001</option>
        <option value="DTP-002">DTP-002</option>
        <option value="DTP-003">DTP-003</option>
      </select>

      <button
        onClick={handleStart}
        className="bg-blue-600 text-white px-6 py-2 rounded shadow"
      >
        Start Case
      </button>
    </div>
  );
}
