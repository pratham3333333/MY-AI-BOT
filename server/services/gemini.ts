import { GoogleGenAI, Modality } from "@google/genai";
import * as fs from "fs";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "" 
});

export async function generateChatResponse(message: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
    });

    return response.text || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate response from Gemini API");
  }
}

export async function generateChatResponseWithHistory(
  messages: Array<{ role: string; content: string; imageUrl?: string | null }>
): Promise<string> {
  try {
    const formattedMessages = messages.map(msg => {
      const parts: any[] = [{ text: msg.content }];
      
      // Add image if present
      if (msg.imageUrl && fs.existsSync(msg.imageUrl)) {
        const imageBytes = fs.readFileSync(msg.imageUrl);
        parts.push({
          inlineData: {
            data: imageBytes.toString("base64"),
            mimeType: "image/jpeg",
          },
        });
      }
      
      return {
        role: msg.role === "assistant" ? "model" : "user",
        parts: parts
      };
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: formattedMessages,
    });

    return response.text || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate response from Gemini API");
  }
}

export async function analyzeImage(imagePath: string, prompt?: string): Promise<string> {
  try {
    const imageBytes = fs.readFileSync(imagePath);
    
    const contents = [
      {
        inlineData: {
          data: imageBytes.toString("base64"),
          mimeType: "image/jpeg",
        },
      },
      prompt || "Analyze this image in detail and describe its key elements, context, and any notable aspects.",
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
    });

    return response.text || "I couldn't analyze this image. Please try again.";
  } catch (error) {
    console.error("Image analysis error:", error);
    throw new Error("Failed to analyze image");
  }
}

export async function generateImage(prompt: string, outputPath: string): Promise<void> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No image generated");
    }

    const content = candidates[0].content;
    if (!content || !content.parts) {
      throw new Error("No image content generated");
    }

    for (const part of content.parts) {
      if (part.inlineData && part.inlineData.data) {
        const imageData = Buffer.from(part.inlineData.data, "base64");
        fs.writeFileSync(outputPath, imageData);
        console.log(`Image saved as ${outputPath}`);
        return;
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Image generation error:", error);
    throw new Error("Failed to generate image");
  }
}
