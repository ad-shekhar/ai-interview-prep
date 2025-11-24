// src/app/api/generate-interview-questions/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import {
  SYSTEM_PROMPT,
  generateQuestionsPrompt,
} from "@/lib/prompts/generate-questions";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

export async function POST(req: Request) {
  logger.info("generate-interview-questions request received");

  const body = await req.json();

  if (!process.env.GEMINI_API_KEY) {
    logger.error("GEMINI_API_KEY is not set");

    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    const userPrompt = generateQuestionsPrompt(body);
    const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}\n\nPlease respond with valid JSON only.`;

    // 🔴 IMPORTANT: keep model name compatible with your SDK
    // If you still see v1beta in the error URL, prefer "gemini-1.5-flash"
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // or "gemini-2.0-flash" if your SDK supports v1
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    // JSON mode: no extra text, we get JSON straight back
    const result = await model.generateContent(fullPrompt);
    const content = result.response.text();

    // Validate JSON once before returning
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      logger.error("Invalid JSON response from Gemini:", content);

      return NextResponse.json(
        { error: "Invalid response format from AI" },
        { status: 500 },
      );
    }

    logger.info("Interview questions generated successfully");

    return NextResponse.json(
      {
        // make frontend usage easy: already parsed
        response: parsed,
      },
      { status: 200 },
    );
  } catch (error: any) {
    logger.error(
      "Error generating interview questions:",
      error?.message || error,
    );

    return NextResponse.json(
      {
        error: error?.message || "internal server error",
        details:
          process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 },
    );
  }
}
