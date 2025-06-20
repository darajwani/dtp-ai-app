import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function CaseSelection({ onStart }) {
  const [caseList, setCaseList] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCases() {
      try {
        const res = await fetch(
          'https://docs.google.com/spreadsheets/d/e/2PACX-1vR6JjnJ30jQl5SBuNuzIzB6mAnaFiWT560ibuw7shujP67ye-k64AIAgt0rC4HGjptGIl1W5ajcsQjk/pub?output=csv'
        );
        const text = await res.text();
        const lines = text.trim().split('\n').slice(1); // skip header
        const cases = lines.map(line => line.split(',')[0]); // assume 1st column is ID
        setCaseList(cases);
      } catch (err) {
        console.error("❌ Failed to load cases:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCases();
  }, []);

  const handleStart = () => {
    if (!selectedCase) return alert('Please select a case');
    const sessionId = uuidv4();
    onStart({ scenarioId: selectedCase, sessionId });
  };

  return (
    <div className="p-10 min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">🧪 Select a Case</h1>

      {loading ? (
        <p>Loading cases...</p>
      ) : (
        <>
          <select
            value={selectedCase}
            onChange={(e) => setSelectedCase(e.target.value)}
            className="border p-2 rounded mb-4 block"
          >
            <option value="">-- Choose Case --</option>
            {caseList.map(caseId => (
              <option key={caseId} value={caseId}>{caseId}</option>
            ))}
          </select>

          <button
            onClick={handleStart}
            className="bg-blue-600 text-white px-6 py-2 rounded shadow"
          >
            Start Case
          </button>
        </>
      )}
    </div>
  );
}
