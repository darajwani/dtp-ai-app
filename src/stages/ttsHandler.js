export async function speakText(text) {
  try {
    const res = await fetch('/.netlify/functions/tts', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!data.audioContent) return;

    const audio = new Audio("data:audio/mp3;base64," + data.audioContent);
    audio.play();
  } catch (err) {
    console.error("TTS error", err);
  }
}

