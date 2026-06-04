import { useCallback, useEffect, useRef, useState } from "react";

const TARGET_SAMPLE_RATE_HZ = 24_000;
const BUFFER_SIZE = 4_096;
const MAX_WAVEFORM_LEVELS = 48;

export type VoiceRecordingPayload = {
  audioBase64: string;
  audioSizeBytes: number;
  durationMs: number;
  mimeType: "audio/wav";
  sampleRateHz: 24000;
};

type RecorderRuntime = {
  audioContext: AudioContext;
  chunks: Float32Array[];
  processorNode: ScriptProcessorNode;
  sampleRateHz: number;
  silentGainNode: GainNode;
  sourceNode: MediaStreamAudioSourceNode;
  startedAt: number;
  stream: MediaStream;
};

function formatVoiceRecordingDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function useVoiceRecorder() {
  const runtimeRef = useRef<RecorderRuntime | null>(null);
  const timerRef = useRef<number | null>(null);
  const waveformLevelsRef = useRef<number[]>([]);
  const waveformLastEmitAtRef = useRef(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>([]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const teardownRuntime = useCallback(async () => {
    const runtime = runtimeRef.current;
    runtimeRef.current = null;
    clearTimer();
    setIsRecording(false);

    if (!runtime) {
      setDurationMs(0);
      return null;
    }

    runtime.processorNode.onaudioprocess = null;
    runtime.sourceNode.disconnect();
    runtime.processorNode.disconnect();
    runtime.silentGainNode.disconnect();
    runtime.stream.getTracks().forEach((track) => track.stop());
    await runtime.audioContext.close().catch(() => undefined);

    const duration = Math.max(0, performance.now() - runtime.startedAt);
    setDurationMs(0);

    return {
      chunks: runtime.chunks,
      durationMs: duration,
      sampleRateHz: runtime.sampleRateHz,
    };
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    if (runtimeRef.current) {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone recording is unavailable in this browser.");
    }

    let audioContext: AudioContext | null = null;
    let processorNode: ScriptProcessorNode | null = null;
    let silentGainNode: GainNode | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      audioContext = new AudioContext();
      await audioContext.resume();

      sourceNode = audioContext.createMediaStreamSource(stream);
      processorNode = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
      silentGainNode = audioContext.createGain();
      silentGainNode.gain.value = 0;

      const runtime: RecorderRuntime = {
        audioContext,
        chunks: [],
        processorNode,
        sampleRateHz: audioContext.sampleRate,
        silentGainNode,
        sourceNode,
        startedAt: performance.now(),
        stream,
      };

      processorNode.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const channelCount = inputBuffer.numberOfChannels;
        const frameCount = inputBuffer.length;
        const monoSamples = new Float32Array(frameCount);

        for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
          const channelData = inputBuffer.getChannelData(channelIndex);
          for (let sampleIndex = 0; sampleIndex < frameCount; sampleIndex += 1) {
            monoSamples[sampleIndex] =
              (monoSamples[sampleIndex] ?? 0) + (channelData[sampleIndex] ?? 0);
          }
        }

        const normalizer = Math.max(1, channelCount);
        for (let sampleIndex = 0; sampleIndex < frameCount; sampleIndex += 1) {
          monoSamples[sampleIndex] = (monoSamples[sampleIndex] ?? 0) / normalizer;
        }

        runtime.chunks.push(monoSamples);

        const rmsLevel = Math.min(
          1,
          Math.sqrt(
            monoSamples.reduce((sum, sample) => sum + sample * sample, 0) /
              Math.max(1, monoSamples.length),
          ) * 3.2,
        );
        const now = performance.now();

        if (now - waveformLastEmitAtRef.current >= 45) {
          waveformLastEmitAtRef.current = now;
          const nextLevels = [...waveformLevelsRef.current, rmsLevel].slice(-MAX_WAVEFORM_LEVELS);
          waveformLevelsRef.current = nextLevels;
          setWaveformLevels(nextLevels);
        }
      };

      sourceNode.connect(processorNode);
      processorNode.connect(silentGainNode);
      silentGainNode.connect(audioContext.destination);

      runtimeRef.current = runtime;
      waveformLevelsRef.current = [];
      waveformLastEmitAtRef.current = 0;
      setDurationMs(0);
      setIsRecording(true);
      setWaveformLevels([]);
      timerRef.current = window.setInterval(() => {
        const activeRuntime = runtimeRef.current;
        if (!activeRuntime) {
          return;
        }

        setDurationMs(Math.max(0, performance.now() - activeRuntime.startedAt));
      }, 200);
    } catch (error) {
      processorNode?.disconnect();
      sourceNode?.disconnect();
      silentGainNode?.disconnect();
      stream?.getTracks().forEach((track) => track.stop());
      await audioContext?.close().catch(() => undefined);
      throw error;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<VoiceRecordingPayload | null> => {
    const recorded = await teardownRuntime();
    if (!recorded) {
      return null;
    }

    const mergedSamples = mergeFloat32Chunks(recorded.chunks);
    if (mergedSamples.length === 0) {
      return null;
    }

    const resampledSamples = resampleLinear(
      mergedSamples,
      recorded.sampleRateHz,
      TARGET_SAMPLE_RATE_HZ,
    );
    if (resampledSamples.length === 0) {
      return null;
    }

    const wavBytes = encodeMono16BitWav(resampledSamples, TARGET_SAMPLE_RATE_HZ);
    const audioBase64 = await arrayBufferToBase64(wavBytes);

    return {
      audioBase64,
      audioSizeBytes: wavBytes.byteLength,
      durationMs: Math.max(
        1,
        Math.round((resampledSamples.length / TARGET_SAMPLE_RATE_HZ) * 1_000) ||
          recorded.durationMs,
      ),
      mimeType: "audio/wav",
      sampleRateHz: TARGET_SAMPLE_RATE_HZ,
    };
  }, [teardownRuntime]);

  const cancelRecording = useCallback(async () => {
    await teardownRuntime();
    waveformLevelsRef.current = [];
    waveformLastEmitAtRef.current = 0;
    setWaveformLevels([]);
  }, [teardownRuntime]);

  useEffect(() => () => {
    void teardownRuntime();
  }, [teardownRuntime]);

  return {
    cancelRecording,
    durationLabel: formatVoiceRecordingDuration(durationMs),
    durationMs,
    isRecording,
    startRecording,
    stopRecording,
    waveformLevels,
  };
}

function mergeFloat32Chunks(chunks: readonly Float32Array[]) {
  let totalLength = 0;
  for (const chunk of chunks) {
    totalLength += chunk.length;
  }

  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

function resampleLinear(
  samples: Float32Array,
  inputSampleRateHz: number,
  outputSampleRateHz: number,
) {
  if (!Number.isFinite(inputSampleRateHz) || inputSampleRateHz <= 0) {
    return new Float32Array(0);
  }
  if (inputSampleRateHz === outputSampleRateHz) {
    return samples.slice();
  }

  const ratio = inputSampleRateHz / outputSampleRateHz;
  const outputLength = Math.max(1, Math.round(samples.length / ratio));
  const output = new Float32Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = index * ratio;
    const leftIndex = Math.floor(sourceIndex);
    const rightIndex = Math.min(samples.length - 1, leftIndex + 1);
    const interpolationWeight = sourceIndex - leftIndex;
    const leftValue = samples[leftIndex] ?? 0;
    const rightValue = samples[rightIndex] ?? leftValue;
    output[index] = leftValue + (rightValue - leftValue) * interpolationWeight;
  }

  return output;
}

function encodeMono16BitWav(samples: Float32Array, sampleRateHz: number) {
  const dataView = new DataView(new ArrayBuffer(44 + samples.length * 2));

  writeAscii(dataView, 0, "RIFF");
  dataView.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(dataView, 8, "WAVE");
  writeAscii(dataView, 12, "fmt ");
  dataView.setUint32(16, 16, true);
  dataView.setUint16(20, 1, true);
  dataView.setUint16(22, 1, true);
  dataView.setUint32(24, sampleRateHz, true);
  dataView.setUint32(28, sampleRateHz * 2, true);
  dataView.setUint16(32, 2, true);
  dataView.setUint16(34, 16, true);
  writeAscii(dataView, 36, "data");
  dataView.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    const pcm = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    dataView.setInt16(offset, Math.round(pcm), true);
    offset += 2;
  }

  return dataView.buffer;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

async function arrayBufferToBase64(buffer: ArrayBuffer) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read recorded audio."));
    });
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("Failed to read recorded audio."));
    });
    reader.readAsDataURL(new Blob([buffer], { type: "audio/wav" }));
  });
  const commaIndex = dataUrl.indexOf(",");

  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}
