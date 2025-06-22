import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  CheckCircle,
  AlertCircle,
  ThumbsUp,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const gradeColor = {
  "Exceeds Standard": "bg-green-100 text-green-700",
  "Meets Standard": "bg-blue-100 text-blue-700",
  "Below Standard": "bg-yellow-100 text-yellow-700",
  "Well Below Standard": "bg-red-100 text-red-700",
};

const FeedbackPage = () => {
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  const sessionId = localStorage.getItem('sessionId');

  const pollScenario2 = async () => {
    if (!sessionId) {
      setFeedback({ error: '❌ No session ID found.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    let tries = 0;
    const maxTries = 10;
    const delay = 2000; // 2 seconds between polls

    while (tries < maxTries) {
      try {
        const res = await fetch('https://hook.eu2.make.com/w99hcfe7ddak4lymp4km7pb8liv32vzl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && Object.keys(data).length > 0 && !data.error) {
            setFeedback(data);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      tries++;
    }

    setLoading(false);
    setFeedback({ error: '⚠️ Feedback not available yet. Please try again shortly.' });
  };

  useEffect(() => {
    const waitThenPoll = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Optional short wait
      pollScenario2();
    };
    waitThenPoll();
  }, []);

  const chartData = feedback && {
    labels: ['Exceeds', 'Meets', 'Below', 'Well Below'],
    datasets: [
      {
        label: 'Rubric Distribution',
        data: [
          feedback['Exceeds Count'],
          feedback['Meets Count'],
          feedback['Below Count'],
          feedback['Well Below Count'],
        ],
        backgroundColor: ['#22c55e', '#3b82f6', '#facc15', '#ef4444'],
      },
    ],
  };

  const GradeBadge = ({ label }) => (
    <span className={`px-2 py-1 text-sm rounded font-semibold ${gradeColor[label] || 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  );

  if (loading) {
    return (
      <div className="p-6 text-lg text-gray-500">
        ⏳ Loading your feedback... Please wait.
      </div>
    );
  }

  if (feedback?.error) {
    return (
      <div className="p-6 text-red-500 space-y-4">
        <p>{feedback.error}</p>
        <button
          onClick={pollScenario2}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Feedback
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-yellow-800 mb-2">📋 AI Feedback Summary</h2>
          <p className="text-gray-600">Evaluation results and personalized feedback from AI</p>
        </div>
        <button
          onClick={pollScenario2}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Grades Section */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 bg-white p-4 rounded shadow">
        <div><strong>📝 History:</strong> <GradeBadge label={feedback['History & Notes Grade']} /></div>
        <div><strong>🧪 Diagnosis:</strong> <GradeBadge label={feedback['Diagnosis Grade']} /></div>
        <div><strong>📄 Written Plan:</strong> <GradeBadge label={feedback['Written Plan Grade']} /></div>
        <div><strong>🗣️ Oral Plan:</strong> <GradeBadge label={feedback['Oral Plan Grade']} /></div>
        <div className="col-span-2"><strong>⭐ Overall Score:</strong> <span className="font-bold text-blue-600">{feedback['Overall Score']}%</span></div>
      </div>

      {/* Summary Section */}
      <div className="bg-gray-50 p-4 rounded shadow space-y-2">
        <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
          <CheckCircle className="w-5 h-5 text-green-600" /> Plain English Summary
        </h3>
        <p className="text-gray-700">{feedback['Plain English Summary']}</p>
      </div>

      <div className="bg-yellow-50 p-4 rounded shadow space-y-2">
        <h3 className="text-xl font-semibold flex items-center gap-2 text-yellow-800">
          <AlertCircle className="w-5 h-5 text-yellow-500" /> Feedback Summary
        </h3>
        <p className="text-gray-800">{feedback['Feedback Summary']}</p>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-800 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" /> Rubric Score Chart
        </h3>
        <Bar data={chartData} />
      </div>

      {/* Questions Analysis */}
      <div className="bg-gray-100 p-4 rounded shadow space-y-2">
        <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
          <ThumbsUp className="w-5 h-5 text-teal-600" /> Question Coverage
        </h3>
        <p><strong>✅ Asked:</strong> {Array.isArray(feedback['Questions Asked']) ? feedback['Questions Asked'].join(', ') : feedback['Questions Asked']}</p>
        <p><strong>❌ Missed:</strong> {Array.isArray(feedback['Questions Missed']) ? feedback['Questions Missed'].join(', ') : feedback['Questions Missed']}</p>
      </div>
    </div>
  );
};

export default FeedbackPage;
