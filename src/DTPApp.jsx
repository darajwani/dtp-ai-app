import { useState } from 'react'
import HistoryInterview from './components/HistoryInterview'
import OrangeStageArtifact from './components/OrangeStageArtifact'
import GreenStageRadiograph from './components/GreenStageRadiograph'
import VerbalStage from './components/VerbalStage';

export default function DTPApp() {
  const [stage, setStage] = useState('history')

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🦷 DTP Case 1 Simulation</h1>

      {stage === 'history' && (
        <>
          <HistoryInterview />
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
          <OrangeStageArtifact />
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
          <GreenStageRadiograph />
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

      {stage === 'verbal' && <VerbalStage />}
    </div>
  )
}
