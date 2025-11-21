import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GEMINI_API_KEY } from "../constants";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Analyzes an image of machinery/equipment to suggest a maintenance ticket description.
 * Uses: gemini-3-pro-preview (High intelligence for vision analysis)
 */
export const analyzeMaintenanceImage = async (base64Image: string): Promise<{ title: string; description: string; priority: string }> => {
  try {
    const modelId = 'gemini-3-pro-preview';
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: `You are an expert industrial maintenance engineer. Analyze this image of equipment. 
            Identify the likely equipment, any visible damage, leaks, wear, or safety hazards.
            Generate a JSON response with:
            - title: A short summary of the issue.
            - description: A detailed technical description of the observed state and recommended action.
            - priority: Suggested priority (Low, Medium, High, Critical).`
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            priority: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text);

  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
};

/**
 * Edits an image based on a text prompt (e.g., "Highlight the crack in red").
 * Uses: gemini-2.5-flash-image (Nano Banana)
 */
export const editMaintenanceImage = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const modelId = 'gemini-2.5-flash-image';

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png', // Assuming PNG for simplicity in this mock
              data: base64Image,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
       return part.inlineData.data;
    }
    throw new Error("No image generated");

  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

/**
 * Uses Search Grounding to find manuals, specs, or troubleshooting guides.
 * Uses: gemini-2.5-flash (Fast + Search Tool)
 */
export const searchMaintenanceKnowledge = async (query: string): Promise<{ text: string; sources: {uri: string, title: string}[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const sources: {uri: string, title: string}[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ uri: chunk.web.uri, title: chunk.web.title });
        }
      });
    }

    return {
      text: response.text || "No information found.",
      sources
    };

  } catch (error) {
    console.error("Search error:", error);
    return { text: "Error connecting to knowledge base.", sources: [] };
  }
};

/**
 * Uses Thinking Mode for complex diagnostic reasoning or planning.
 * Uses: gemini-3-pro-preview
 */
export const complexDiagnostics = async (context: string, problem: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Context: ${context}\n\nProblem: ${problem}\n\nProvide a comprehensive root cause analysis and step-by-step resolution plan. Consider long-term reliability.`,
      config: {
        thinkingConfig: {
          thinkingBudget: 32768, // Max thinking budget for deep reasoning
        }
      }
    });

    return response.text || "Could not generate diagnosis.";
  } catch (error) {
    console.error("Thinking error:", error);
    throw error;
  }
};

/**
 * Analyzes maintenance description to estimate costs and actions.
 * Uses: gemini-2.5-flash (Fast text processing)
 */
export const analyzeMaintenanceCost = async (
  title: string, 
  description: string, 
  assetName: string
): Promise<{ 
  rootCause: string; 
  recommendedActions: string[]; 
  estimatedLaborHours: number; 
  estimatedPartsCost: number; 
  confidenceScore: string;
}> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are a Senior Maintenance Estimator. 
        Asset: ${assetName}
        Issue Title: ${title}
        Technician Description: "${description}"

        Analyze this input and provide a structured cost estimation.
        1. Identify potential root cause from the messy description.
        2. List 3-5 bullet points of recommended repair actions.
        3. Estimate labor hours required.
        4. Estimate spare parts cost (in THB - Thai Baht). Assume standard industrial pricing.
        5. Give a confidence score (Low/Medium/High) based on how clear the description is.
      `,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rootCause: { type: Type.STRING },
            recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            estimatedLaborHours: { type: Type.NUMBER },
            estimatedPartsCost: { type: Type.NUMBER },
            confidenceScore: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text);

  } catch (error) {
    console.error("Cost analysis error:", error);
    return {
        rootCause: "Analysis failed",
        recommendedActions: [],
        estimatedLaborHours: 0,
        estimatedPartsCost: 0,
        confidenceScore: "Low"
    };
  }
};
