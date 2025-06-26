import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Helper to extract query parameter
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function OrangeStageArtifact() {
  const query = useQuery();
  const caseId = query.get('caseId');

  const [data, setData] = useState(null);
  const [photoUrls, setPhotoUrls] = useState({});

  // Fetch clinical info from Google Sheet CSV
  useEffect(() => {
    async function fetchClinicalData() {
      try {
        const res = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRANdBPhVhp5kkdaU4mWn9PQjmJ1WZBXeddLeqRs0x6LGuMWttZ3vb2Easm1Ymkwwa4Y_erHDjwhrna/pub?output=csv');
        const text = await res.text();
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',');
        const caseRows = lines.slice(1).map(line => {
          const values = line.split(',');
          const row = {};
          headers.forEach((key, i) => row[key.trim()] = values[i]?.trim());
          return row;
        });
        const matched = caseRows.find(row => row.caseId === caseId);
        if (matched) setData(matched);
      } catch (err) {
        console.error('❌ Failed to fetch clinical data:', err);
      }
    }

    if (caseId) {
      fetchClinicalData();
      setPhotoUrls({
        extraoral: `/images/cases/${caseId}/extraoral.jpg`,
        intraoral: `/images/cases/${caseId}/intraoral.jpg`,
      });
    }
  }, [caseId]);

  return (
    <div className="bg-orange-100 min-h-screen p-6 space-y-6">
      <h2 className="text-2xl font-bold text-orange-800">🟠 Stage 2 – Clinical Interpretation</h2>

      {/* Clinical Findings */}
      <div className="bg-white p-4 rounded shadow space-y-4">
        <h3 className="font-semibold">🧑‍⚕️ Extraoral Examination</h3>
        <p>{data?.extraoralExam || 'Loading...'}</p>

        <h3 className="font-semibold mt-4">👄 Intraoral Examination</h3>
        <p>{data?.intraoralExam || 'Loading...'}</p>

        <h3 className="font-semibold mt-4">🪥 BPE Score</h3>
        <p>{data?.bpeScore || 'Loading...'}</p>
      </div>

      {/* Photos */}
      <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded shadow">
        <div>
          <h4 className="font-semibold">Extraoral Photo</h4>
          <img src={photoUrls.extraoral} alt="Extraoral" className="rounded border" />
        </div>
        <div>
          <h4 className="font-semibold">Intraoral Photo</h4>
          <img src={photoUrls.intraoral} alt="Intraoral" className="rounded border" />
        </div>
      </div>

      {/* Teeth Chart */}
      <div className="bg-white p-4 rounded shadow text-center">
        <h4 className="font-semibold mb-2">🦷 Teeth Chart (1–8 System)</h4>
        <img src="/teeth_chart_1_to_8.png" alt="Teeth Chart" className="mx-auto border rounded" />
      </div>

      {/* Instructions */}
      <div className="bg-white p-4 rounded shadow">
        <p className="font-medium">
          👉 Please complete the <span className="font-bold">Orange Sheets</span> manually using the details above.
        </p>
      </div>

      <div className="text-right">
        <button
          onClick={() => window.location.href = `/radiograph-stage?caseId=${caseId}`}
          className="bg-green-600 text-white px-6 py-2 rounded"
        >
          Continue to Green Sheet Stage
        </button>
      </div>
    </div>
  );
}
