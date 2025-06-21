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

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      const sessionId = localStorage.getItem('sessionId'); // Replace or mock if needed
      if (!sessionId) return alert('No session ID found.');

      try {
        const res = await fetch(
          'https://hook.eu2.make.com/w99hcfe7ddak4lymp4km7pb8liv32vzl',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          }
        );
        const data = await res.json();
        setFeedback(data);
      } catch (err) {
        console.error('Error fetching feedback:', err);
        alert('Failed to load feedback.');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, []);

  if (loading) return <p className="p-6">Loading feedback...</p>;
  if (!feedback) return <p className="p-6 text-red-500">No feedback found.</p>;

  const chartData = {
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
        backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
      },
    ],
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold text-yellow-800">📋 AI Feedback Summary</h2>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-lg">
        <p><strong>History Grade:</strong> {feedback['History & Notes Grade']}</p>
        <p><strong>Diagnosis Grade:</strong> {feedback['Diagnosis Grade']}</p>
        <p><strong>Written Plan Grade:</strong> {feedback['Written Plan Grade']}</p>
        <p><strong>Oral Plan Grade:</strong> {feedback['Oral Plan Grade']}</p>
        <p><strong>Overall Score:</strong> {feedback['Overall Score']}</p>
      </div>

      <div className="bg-gray-100 p-4 rounded shadow">
        <h3 className="font-semibold text-xl mb-2">🧠 Plain English Summary</h3>
        <p className="text-gray-700">{feedback['Plain English Summary']}</p>
      </div>

      <div className="bg-yellow-50 p-4 rounded shadow">
        <h3 className="font-semibold text-xl mb-2">💬 Feedback Summary</h3>
        <p className="text-gray-700">{feedback['Feedback Summary']}</p>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold text-xl mb-4">📊 Score Distribution</h3>
        <Bar data={chartData} />
      </div>

      <div className="bg-gray-50 p-4 rounded shadow">
        <h3 className="font-semibold text-xl mb-2">❓ Questions Asked / Missed</h3>
        <p><strong>Asked:</strong> {Array.isArray(feedback['Questions Asked']) ? feedback['Questions Asked'].join(', ') : feedback['Questions Asked']}</p>
        <p><strong>Missed:</strong> {Array.isArray(feedback['Questions Missed']) ? feedback['Questions Missed'].join(', ') : feedback['Questions Missed']}</p>
      </div>
    </div>
  );
}
