// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Routes
import authRoutes from "./routes/auth.js";
import moodRoutes from "./routes/mood.js";
import profileRoutes from "./routes/profile.js";
import meditationRoutes from "./routes/meditation.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: "https://chillsaathi-aii.vercel.app", // Allow your frontend
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// Gemini API Check
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in .env");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ⚠️ IMPORTANT: For production, you MUST manage chat sessions persistently (e.g., using express-session, database).
// This simple in-memory map is for demonstration/testing purposes only.
const chatSessions = new Map(); // Stores chat sessions: Map<userId, ChatSession>

// 📌 Chatbot Route
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  // Assuming you have a way to identify the user (e.g., from authentication token)
  // For this example, we'll use a placeholder `userId`.
  // In a real app, you'd get this from `req.user` after authentication.
  const userId = req.body.userId || "anonymous"; // Use a real user ID here

  try {
    let chat;
    // Check if a chat session already exists for this user
    if (chatSessions.has(userId)) {
      chat = chatSessions.get(userId);
    } else {
      // If no session, create a new one
   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
      chat = model.startChat({
        history: [], // Initialize with empty history for a new session
        generationConfig: {
          maxOutputTokens: 500, // Adjust as needed
        },
      });
      chatSessions.set(userId, chat); // Store the new chat session
    }

    // Send the user's message to the chat session
    const result = await chat.sendMessage(userMessage);
    const text = await result.response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    // Log the full error response from the API if available
    if (error.response && error.response.data) {
      console.error("Gemini API detailed error:", error.response.data);
    }
    res.status(500).json({ reply: "Error generating response. Please check your API key and network connection." });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/mood", moodRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/meditations", meditationRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
