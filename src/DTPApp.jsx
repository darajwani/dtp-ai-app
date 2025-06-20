import { useState } from 'react';
import CaseSelection from './pages/CaseSelection';
import HistoryInterview from './components/HistoryInterview';
import OrangeStageArtifact from './components/OrangeStageArtifact';
import GreenStageRadiograph from './components/GreenStageRadiograph';
import VerbalStage from './components/VerbalStage';

export default function DTPApp() {
  const [stage, setStage] = useState('select'); // start from case selection
  const [sessionId, setSessionId] = useState(null);
  const [scenarioId, setScenarioId] = useState(null);

  const handleStart = ({ sessionId, scenarioId }) => {
    setSessionId(sessionId);
    setScenarioId(scenarioId);
    setStage('history');
  };

  return (
    <div className="p-6">
      {stage === 'select' && <CaseSelection onStart={handleStart} />}

      {stage === 'history' && (
        <>
          <h1 className="text-2xl font-bold mb-4">🦷 {scenarioId} – History Interview</h1>
          <HistoryInterview sessionId={sessionId} scenarioId={scenarioId} />
          <div className="text-right mt-4">
            <button
              onClick={() => setStage('artifact')}
              className="bg-orange-600 text-white px-4 py-2 rounded"
            >
              Proceed to Orange Stage
            </button>
          </div>
        </>
      )}

      {stage === 'artifact' && (
        <>
          <h1 className="text-2xl font-bold mb-4">🟧 {scenarioId} – Artifact Stage</h1>
          <OrangeStageArtifact sessionId={sessionId} scenarioId={scenarioId} />
          <div className="text-right mt-4">
            <button
              onClick={() => setStage('radiograph')}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Proceed to Green Sheet Stage
            </button>
          </div>
        </>
      )}

      {stage === 'radiograph' && (
        <>
          <h1 className="text-2xl font-bold mb-4">🟩 {scenarioId} – Radiograph Stage</h1>
          <GreenStageRadiograph sessionId={sessionId} scenarioId={scenarioId} />
          <div className="text-right mt-4">
            <button
              onClick={() => setStage('verbal')}
              className="bg-yellow-600 text-white px-4 py-2 rounded"
            >
              Proceed to Verbal Stage
            </button>
          </div>
        </>
      )}

      {stage === 'verbal' && (
        <>
          <h1 className="text-2xl font-bold mb-4">🟨 {scenarioId} – Verbal Stage</h1>
          <VerbalStage sessionId={sessionId} scenarioId={scenarioId} />
        </>
      )}
    </div>
  );
}
