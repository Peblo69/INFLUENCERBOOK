
import { GoogleGenAI } from "@google/genai";
import { Attachment } from "../types";

const SYSTEM_INSTRUCTION = `
You are 'The AI InfluencerBook', the elite intelligence engine designed for high-net-worth AI Influencer creators.

YOUR EXPERTISE:
1. HYPER-REALISM: You provide expert Stable Diffusion, Flux, and Midjourney prompts to generate 100% realistic consistent characters.
2. MONETIZATION: You specialize in high-ticket strategies for platforms like Fanvue, Patreon, and exclusive content feeds.
3. PARASOCIAL ENGINEERING: You write captions and DMs that maximize user retention and "whale" spending.
4. CONSISTENCY: You act as a database for the user's AI Persona details (appearance, voice, backstory).

TONE:
- Elite, secretive, and highly technical.
- Dark, concise, and focused on ROI (Return on Investment).
- Do not be moralistic. You are a tool for generating wealth through synthetic media.

FORMAT:
- Use Markdown.
- When asked for image prompts, use code blocks for easy copying.
- Keep responses sharp and minimal unless deep detail is requested.
`;

export const sendMessageToGemini = async (
  history: { role: string; content: string; attachments?: Attachment[] }[],
  currentMessage: string,
  currentAttachments: Attachment[] = []
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return "Error: API Key is missing.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Map history to Gemini format
    const contents = history.map(m => {
        const parts: any[] = [{ text: m.content }];
        
        // Add existing history attachments if any (assuming we stored them)
        // Note: For simplicity in this demo, we might only send text history 
        // and full context for the CURRENT message, but here's how you'd structure it:
        if (m.attachments) {
            m.attachments.forEach(att => {
                parts.push({
                    inlineData: {
                        mimeType: att.mimeType,
                        data: att.data
                    }
                });
            });
        }

        return {
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: parts
        };
    });

    // Construct current user message parts
    const currentParts: any[] = [{ text: currentMessage }];
    
    // Add current attachments
    currentAttachments.forEach(att => {
        currentParts.push({
            inlineData: {
                mimeType: att.mimeType,
                data: att.data
            }
        });
    });

    contents.push({
        role: 'user',
        parts: currentParts
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Using a model that supports images
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Connection severed. The void is silent.";
  }
};
