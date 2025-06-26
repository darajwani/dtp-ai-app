import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

// Helper to extract query parameter
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function GreenStageRadiograph({ onNext }) {
  const query = useQuery();
  const caseId = query.get('caseId');
  const [radiographUrl, setRadiographUrl] = useState('');

  useEffect(() => {
    if (caseId) {
      setRadiographUrl(`/images/cases/${caseId}/radiograph.jpg`);
    }
  }, [caseId]);

  return (
    <div className="bg-green-100 min-h-screen p-6 space-y-6">
      <h2 className="text-2xl font-bold text-green-800">🟢 Stage 3 – Radiograph & Treatment Planning</h2>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Radiograph</h3>
        <img
          src={radiographUrl || 'https://via.placeholder.com/500x400?text=Radiograph'}
          alt="Radiograph"
          className="rounded border max-w-full"
        />
      </div>

      <div className="bg-white p-4 rounded shadow">
        <p className="text-green-900 font-medium">
          ✍️ Please use the Green Sheets to complete the following:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-gray-800">
          <li>Radiograph report</li>
          <li>Full treatment plan across all phases</li>
          <li>Answer any justification questions listed in your pack</li>
        </ul>
      </div>

      <div className="text-right">
        <button
          onClick={onNext}
          className="bg-neutral-700 text-white px-6 py-2 rounded"
        >
          Proceed to Verbal Presentation
        </button>
      </div>
    </div>
  );
}
