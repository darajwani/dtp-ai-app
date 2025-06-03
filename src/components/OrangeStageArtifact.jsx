import caseData from '../data/case1.json'

export default function OrangeStageArtifact() {
  return (
    <div className="bg-orange-100 min-h-screen p-6 space-y-6">
      <h2 className="text-2xl font-bold text-orange-800">🟠 Stage 2 – Clinical Interpretation</h2>

      {/* Clinical Findings */}
      <div className="bg-white p-4 rounded shadow space-y-4">
        <h3 className="font-semibold">🧑‍⚕️ Extraoral Examination</h3>
        <p>{caseData.extraoralExam}</p>

        <h3 className="font-semibold mt-4">👄 Intraoral Examination</h3>
        <p>{caseData.intraoralExam}</p>

        <h3 className="font-semibold mt-4">🪥 BPE Score</h3>
        <p>{caseData.bpeScore}</p>
      </div>

      {/* Photos */}
      <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded shadow">
        <div>
          <h4 className="font-semibold">Extraoral Photo</h4>
          <img src={caseData.extraoralPhoto} alt="Extraoral" className="rounded border" />
        </div>
        <div>
          <h4 className="font-semibold">Intraoral Photo</h4>
          <img src={caseData.intraoralPhoto} alt="Intraoral" className="rounded border" />
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
          onClick={() => window.location.href = '/radiograph-stage'}
          className="bg-green-600 text-white px-6 py-2 rounded"
        >
          Continue to Green Sheet Stage
        </button>
      </div>
    </div>
  )
}
