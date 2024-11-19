import { TurnDetectionTypeId } from "@/data/turn-end-types";
import { ModalitiesId } from "@/data/modalities";
import { VoiceId } from "@/data/voices";
import { ModelId } from "./models";
import { TranscriptionModelId } from "./transcription-models";

export interface SessionConfig {
    model: ModelId;
    transcriptionModel: TranscriptionModelId;
    turnDetection: TurnDetectionTypeId;
    modalities: ModalitiesId;
    voice: VoiceId;
    temperature: number;
    maxOutputTokens: number | null;
    vadThreshold: number;
    vadSilenceDurationMs: number;
    vadPrefixPaddingMs: number;
  }

export interface ChatbotData {
    sessionConfig: SessionConfig;
    selectedPresetId: string | null;
    openaiAPIKey: string | null | undefined;
    instructions: string;
  }