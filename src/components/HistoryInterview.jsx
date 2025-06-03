import { useState } from 'react'
import caseData from '../data/case1.json'

export default function HistoryInterview() {
  const [messages, setMessages] = useState([
    { from: 'ai', text: caseData.initialPrompt }
  ])
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return

    const newMessages = [...messages, { from: 'user', text: input }]
    const response = simulateAIResponse(input, caseData.responses)

    setMessages([...newMessages, { from: 'ai', text: response }])
    setInput('')
  }

  const simulateAIResponse = (input, responses) => {
    const lower = input.toLowerCase()
    for (const keyword in responses) {
      if (lower.includes(keyword)) return responses[keyword]
    }
    return "Can you clarify what you mean?"
  }

  return (
    <div>
      <div className="bg-gray-100 p-4 rounded shadow max-h-[300px] overflow-y-auto mb-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`${msg.from === 'ai' ? 'text-blue-600' : 'text-black'} mb-2`}>
            <strong>{msg.from === 'ai' ? 'Patient:' : 'You:'}</strong> {msg.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="border px-4 py-2 rounded w-full"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question..."
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  )
}
