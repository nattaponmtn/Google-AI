import { FunctionDeclaration, GoogleGenAI, Modality, Type } from "@google/genai";
import { GEMINI_API_KEY } from "../constants";
import { WorkOrder, Asset, WorkOrderPart, InventoryPart } from "../types";

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
 * Edits a maintenance image based on instructions.
 * Uses: gemini-2.5-flash-image
 */
export const editMaintenanceImage = async (
  base64Image: string, 
  mimeType: string, 
  prompt: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          {
            text: prompt
          }
        ]
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }
    
    throw new Error("No image generated");
  } catch (error) {
    console.error("Edit image error:", error);
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

// --- APP INTERNAL DATA QUERY (Enhanced with Smart Mapping) ---

export const queryAppAssistant = async (
  query: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[], // ✅ รับประวัติการคุย
  contextData: {
    workOrders: WorkOrder[];
    assets: Asset[];
    partsUsed: WorkOrderPart[];
    inventoryParts: InventoryPart[];
  }
): Promise<string> => {
  try {
    // 1. Define Tools
    const tools = [
      {
        functionDeclarations: [
          {
            name: "get_work_orders",
            description: "Search for maintenance work orders. Use this to find jobs, check status, or see history.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                keyword: { 
                  type: Type.STRING, 
                  description: "Search term (Asset name, Location, Title, or WO Number). Use 'all' if searching for everything." 
                },
                status: { 
                  type: Type.STRING, 
                  description: "Filter by status category (e.g., 'active' for open jobs, 'completed' for done, 'all' for everything). Default is 'active' if user implies current work."
                },
                period: { 
                  type: Type.STRING, 
                  description: "Time period (this_month, last_month, all). Default is 'all'." 
                }
              },
            }
          },
          {
            name: "get_parts_usage",
            description: "Check spare parts usage history for specific assets or locations.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                keyword: { type: Type.STRING, description: "Asset Name or Location to search usage for." }
              },
              required: ["keyword"]
            }
          }
        ]
      }
    ];

    // 2. Initialize Chat with Persona & History
    const chatSession = ai.chats.create({
      model: "gemini-2.5-flash",
      history: history,
      config: {
        systemInstruction: `You are 'Belle', a smart and helpful CMMS Assistant for maintenance teams.
        Your goal is to help users find data in the system.

        CRITICAL RULES:
        1. **Be Flexible:** If the user asks "Any broken machines?" or "Show pending jobs", interpret this as searching for status='active'.
        2. **Ask for Clarification:** If the query is too vague (e.g., "Show me the pump"), DO NOT GUESS. Ask: "Which pump? or Which location?"
        3. **Context Aware:** Remember previous messages.
        4. **Language:** Answer in the same language as the user (Thai/English).
        5. **Company Mapping:** The user uses nicknames for locations.
           - "ฟาร์มไก่" (Chicken Farm) = LAK or TKB
           - "ฟาร์มวัว" (Cow Farm) = S.A.
           - "ศูนย์นม" (Milk Center) = SM
           - "โกดังหางดง" or "ออฟฟิศ" = CTC
           - "ฟาร์มปลา" (Fish Farm) = TSF
        
        When data is found, summarize it clearly. If NO data found, say "No records found matching your criteria."`,
        tools: tools,
      }
    });

    // 3. Send Message
    let result = await chatSession.sendMessage({ message: query });
    let functionCall = result.functionCalls?.[0];

    // 4. Handle Function Call
    if (functionCall) {
      const { name, args } = functionCall;
      let toolResult: any = "No data found.";

      // --- EXECUTE LOCAL LOGIC ---
      if (name === "get_work_orders") {
        let keyword = (args as any).keyword ? (args as any).keyword.toLowerCase() : '';
        const statusArg = (args as any).status ? (args as any).status.toLowerCase() : '';
        const period = (args as any).period || 'all';
        
        // 🧠 SMART MAPPING: แปลงชื่อเล่นเป็นรหัสบริษัท
        if (keyword.includes('ฟาร์มไก่') || keyword.includes('chicken')) {
            keyword = 'lak'; // Default to LAK
        } else if (keyword.includes('ฟาร์มวัว') || keyword.includes('cow') || keyword.includes('s.a.')) {
            keyword = 's.a.';
        } else if (keyword.includes('นม') || keyword.includes('milk')) {
            keyword = 'sm';
        } else if (keyword.includes('หางดง') || keyword.includes('office') || keyword.includes('ctc')) {
            keyword = 'ctc';
        } else if (keyword.includes('ปลา') || keyword.includes('fish')) {
            keyword = 'tsf';
        }

        let filtered = contextData.workOrders;

        // A. Filter by Keyword (Enhanced)
        if (keyword && keyword !== 'all') {
           filtered = filtered.filter(wo => 
             (wo.assetName?.toLowerCase().includes(keyword) || 
              wo.locationId?.toLowerCase().includes(keyword) ||
              wo.title.toLowerCase().includes(keyword) ||
              wo.woNumber.toLowerCase().includes(keyword) ||
              wo.companyName?.toLowerCase().includes(keyword) || // ✅ เพิ่มค้นหาชื่อบริษัท
              wo.companyId?.toLowerCase().includes(keyword))     // ✅ เพิ่มค้นหารหัสบริษัท
           );

           // Special logic: ถ้าค้นหา "ฟาร์มไก่" (lak) ให้รวม TKB ด้วย
           if (keyword === 'lak') {
               const tkbJobs = contextData.workOrders.filter(wo => wo.companyId?.toLowerCase() === 'tkb');
               const existingIds = new Set(filtered.map(f => f.id));
               tkbJobs.forEach(j => {
                   if (!existingIds.has(j.id)) filtered.push(j);
               });
           }
        }

        // B. Filter by Status
        if (statusArg) {
            if (statusArg.includes('activ') || statusArg.includes('open') || statusArg.includes('pend') || statusArg.includes('wait')) {
                filtered = filtered.filter(wo => wo.status !== 'Completed' && wo.status !== 'Maintenance');
            } else if (statusArg.includes('complet') || statusArg.includes('done')) {
                filtered = filtered.filter(wo => wo.status === 'Completed');
            }
        }

        // C. Filter by Period
        const now = new Date();
        if (period === 'this_month') {
           filtered = filtered.filter(wo => new Date(wo.createdAt).getMonth() === now.getMonth() && new Date(wo.createdAt).getFullYear() === now.getFullYear());
        } else if (period === 'last_month') {
           const lastMonth = new Date();
           lastMonth.setMonth(now.getMonth() - 1);
           filtered = filtered.filter(wo => new Date(wo.createdAt).getMonth() === lastMonth.getMonth() && new Date(wo.createdAt).getFullYear() === lastMonth.getFullYear());
        }

        toolResult = filtered.slice(0, 15).map(wo => ({ 
           id: wo.woNumber, title: wo.title, status: wo.status, asset: wo.assetName, date: wo.createdAt.split('T')[0]
        }));
      }
      
      else if (name === "get_parts_usage") {
         const keyword = (args as any).keyword.toLowerCase();
         // Find WOs first
         const relevantWOs = contextData.workOrders.filter(wo => 
             (wo.assetName?.toLowerCase().includes(keyword) || 
              wo.locationId?.toLowerCase().includes(keyword) ||
              wo.companyName?.toLowerCase().includes(keyword))
         );
         const woIds = relevantWOs.map(w => w.id);
         const used = contextData.partsUsed.filter(p => woIds.includes(p.workOrderId));
         
         toolResult = used.map(u => {
             const part = contextData.inventoryParts.find(ip => ip.id === u.partId);
             const wo = relevantWOs.find(w => w.id === u.workOrderId);
             return {
                 partName: part ? part.name : u.partId,
                 qty: u.quantityUsed,
                 wo: wo ? wo.title : 'Unknown',
                 date: wo ? wo.createdAt.split('T')[0] : ''
             };
         });
      }

      // 5. Send Tool Result back to Model
      result = await chatSession.sendMessage({
        message: [{
          functionResponse: {
            name: name,
            response: { result: toolResult }
          }
        }]
      });
    }

    return result.text || "Sorry, I couldn't process that.";

  } catch (error) {
    console.error("App Query Error:", error);
    return "ขอโทษค่ะ ระบบเกิดขัดข้องในการเชื่อมต่อฐานข้อมูล (Database Error)";
  }
};
