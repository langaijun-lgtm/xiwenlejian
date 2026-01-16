import { Request, Response } from "express";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import multer from "multer";
import { nanoid } from "nanoid";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB limit
  },
});

export const uploadMiddleware = upload.single('audio');

export async function handleTranscribe(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    // Upload audio to S3
    const fileKey = `transcriptions/${nanoid()}.webm`;
    const { url } = await storagePut(fileKey, req.file.buffer, "audio/webm");

    // Transcribe audio
    const result = await transcribeAudio({
      audioUrl: url,
      language: "zh",
    });

    if ('error' in result) {
      throw new Error(result.error);
    }

    return res.json({
      text: result.text,
      language: result.language,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return res.status(500).json({ error: "Transcription failed" });
  }
}
