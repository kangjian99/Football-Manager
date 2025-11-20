import { GoogleGenAI } from "@google/genai";
import { Team } from '../types';

const getAI = () => {
  // Prioritize the key from LocalStorage (user input), fallback to environment variable
  const apiKey = localStorage.getItem('gemini_api_key') || process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const getPreMatchAnalysis = async (userTeam: Team, opponent: Team): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Assistant Manager: Please configure your API Key to receive scouting reports.";

  const prompt = `
    Role: You are the Assistant Manager of ${userTeam.name} in an Italian football simulation game.
    Task: Provide a brief, 2-sentence pre-match analysis for our upcoming game against ${opponent.name}.
    Context:
    Our Stats - ATT: ${userTeam.att}, MID: ${userTeam.mid}, DEF: ${userTeam.def}
    Opponent Stats - ATT: ${opponent.att}, MID: ${opponent.mid}, DEF: ${opponent.def}
    
    Style: Professional, slightly Italian flair, concise. Suggest a focus area.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis available.";
  } catch (e) {
    console.error("AI Error", e);
    return "Assistant Manager: Scouting report is unavailable due to connection issues.";
  }
};

export const getMatchCommentary = async (matchInfo: string, minute: number): Promise<string> => {
    const ai = getAI();
    if (!ai) return "";
  
    // This is expensive to call every minute, so we might use it sparsely for key events.
    // For this demo, we'll assume it's called only on Goals.
    const prompt = `
      Write a thrilling 1-sentence commentary for a goal scored in minute ${minute}.
      Match context: ${matchInfo}.
      Style: Italian soccer commentator style (passionate).
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || "GOAL!";
    } catch (e) {
      return "GOAL! What a finish!";
    }
  };