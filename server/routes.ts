import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import { generateChatResponseWithHistory, analyzeImage, generateImage } from "./services/gemini";
import { z } from "zod";
import multer from "multer";
import path from "path";
import * as fs from "fs";

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().min(1),
});

const imageGenerationSchema = z.object({
  prompt: z.string().min(1).max(1000),
  sessionId: z.string().min(1),
});

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Send message to chat and get response
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, sessionId } = chatRequestSchema.parse(req.body);

      // Store user message
      const userMessage = await storage.createMessage({
        content: message,
        role: "user",
        sessionId,
      });

      // Get conversation history
      const history = await storage.getMessagesBySessionId(sessionId);
      const conversationHistory = history.map(msg => ({
        role: msg.role,
        content: msg.content,
        imageUrl: msg.imageUrl
      }));

      // Generate response from Gemini
      const responseText = await generateChatResponseWithHistory(conversationHistory);

      // Store assistant message
      const assistantMessage = await storage.createMessage({
        content: responseText,
        role: "assistant",
        sessionId,
      });

      res.json({
        userMessage,
        assistantMessage,
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to process chat message" 
      });
    }
  });

  // Get chat history for a session
  app.get("/api/chat/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getMessagesBySessionId(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Get chat history error:", error);
      res.status(500).json({ message: "Failed to retrieve chat history" });
    }
  });

  // Clear chat history for a session
  app.delete("/api/chat/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      await storage.clearMessagesBySessionId(sessionId);
      res.json({ message: "Chat history cleared" });
    } catch (error) {
      console.error("Clear chat error:", error);
      res.status(500).json({ message: "Failed to clear chat history" });
    }
  });

  // Upload and analyze image
  app.post("/api/upload-image", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const { sessionId, message = "" } = req.body;
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      const imagePath = req.file.path;

      // Store user message with image
      const userMessage = await storage.createMessage({
        content: message || "I've uploaded an image for you to analyze.",
        role: "user",
        sessionId,
        imageUrl: imagePath,
        messageType: "image"
      });

      // Analyze the image
      const analysisResult = await analyzeImage(imagePath, message || undefined);

      // Store assistant response
      const assistantMessage = await storage.createMessage({
        content: analysisResult,
        role: "assistant",
        sessionId,
        imageUrl: null,
        messageType: "text"
      });

      res.json({
        userMessage,
        assistantMessage,
      });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to process image upload" 
      });
    }
  });

  // Generate image
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, sessionId } = imageGenerationSchema.parse(req.body);

      // Store user message for image generation request
      const userMessage = await storage.createMessage({
        content: `Generate an image: ${prompt}`,
        role: "user",
        sessionId,
        imageUrl: null,
        messageType: "text"
      });

      // Generate image
      const imageFilename = `generated_${Date.now()}.jpg`;
      const imagePath = path.join('uploads', imageFilename);
      await generateImage(prompt, imagePath);

      // Store assistant message with generated image
      const assistantMessage = await storage.createMessage({
        content: `I've generated an image based on your prompt: "${prompt}"`,
        role: "assistant",
        sessionId,
        imageUrl: imagePath,
        messageType: "image_generation"
      });

      res.json({
        userMessage,
        assistantMessage,
      });
    } catch (error) {
      console.error("Image generation error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate image" 
      });
    }
  });

  // Serve uploaded images
  app.get("/api/images/:filename", (req, res) => {
    const { filename } = req.params;
    const imagePath = path.join('uploads', filename);
    
    if (fs.existsSync(imagePath)) {
      res.sendFile(path.resolve(imagePath));
    } else {
      res.status(404).json({ message: "Image not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
