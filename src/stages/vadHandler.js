export function useVAD(onSpeechEnd) {
  let vadInstance = null;
  let stream = null;
  let mediaRecorder = null;
  let chunkBuffer = [];

  const start = async () => {
    const vad = window?.vad || window;
    if (!vad?.MicVAD) return console.error("❌ MicVAD not available");

    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    vadInstance = await vad.MicVAD.new({
      onSpeechStart: () => {
        chunkBuffer = [];
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        });

        mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) chunkBuffer.push(e.data);
        };

        mediaRecorder.onstop = () => {
          if (chunkBuffer.length > 0) {
            const blob = new Blob(chunkBuffer, { type: 'audio/webm' });
            onSpeechEnd(blob);
          }
        };

        mediaRecorder.start();
      },
      onSpeechEnd: () => {
        if (mediaRecorder?.state === 'recording') {
          setTimeout(() => {
            if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
          }, 300);
        }
      },
      modelURL: '/vad/silero_vad.onnx',
      throttleTime: 200,
      positiveSpeechThreshold: 0.5,
      negativeSpeechThreshold: 0.3,
    });

    await vadInstance.start();
  };

  const stop = () => {
    vadInstance?.stop();
    stream?.getTracks().forEach(track => track.stop());
  };

  const reset = () => {
    stop();
    start();
  };

  return { start, stop, reset };
}

