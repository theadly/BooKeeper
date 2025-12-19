
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Transaction, Contact, Category, Campaign, BankTransaction, Deliverable, ParsedRateItem, BankStatementResponse, QuotationResponse } from "../types";
import { RATE_CARD_SERVICES } from "../constants";
import { CONFIG } from "../config";

const getAiClient = () => {
  const key = process.env.API_KEY || CONFIG.API_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
};

/**
 * Clean AI response to ensure valid JSON
 */
const cleanJsonResponse = (text: any) => {
  if (!text || typeof text !== 'string') return null;
  try {
    // Remove markdown code blocks if present
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Clean/Parse failed:", text);
    return null;
  }
};

export const updateStatusTool: FunctionDeclaration = {
  name: 'update_ledger_status',
  parameters: {
    type: Type.OBJECT,
    description: 'Update the status of one or more ledger entries.',
    properties: {
      projectNames: { type: Type.ARRAY, items: { type: Type.STRING } },
      field: { type: Type.STRING, enum: ['clientStatus', 'ladlyStatus'] },
      status: { type: Type.STRING, enum: ['Paid', 'Paid to personal account', 'Pending', 'Unpaid', 'Overdue', 'Void', 'Draft'] }
    },
    required: ['projectNames', 'field', 'status']
  }
};

export const reconcileTool: FunctionDeclaration = {
  name: 'match_ledger_with_bank',
  parameters: {
    type: Type.OBJECT,
    description: 'Match a specific ledger entry with a bank transaction.',
    properties: {
      projectName: { type: Type.STRING },
      bankTransactionId: { type: Type.STRING }
    },
    required: ['projectName', 'bankTransactionId']
  }
};

export const parseBankStatement = async (base64Data: string, mimeType: string): Promise<BankTransaction[]> => {
  const ai = getAiClient();
  if (!ai) throw new Error("AI Client not initialized");
  
  const validCategories = Object.values(Category).join(', ');
  const safeMime = mimeType || 'application/pdf';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: safeMime, data: base64Data } },
          { text: `List every transaction from this statement. Assign a 'category' from: [${validCategories}]. Output raw JSON array only.` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              description: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              currency: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['credit', 'debit'] },
              category: { type: Type.STRING },
              vendor: { type: Type.STRING }
            },
            required: ['date', 'amount', 'type', 'description']
          }
        }
      }
    });
    
    const parsed = cleanJsonResponse(response.text);
    if (!Array.isArray(parsed)) return [];
    
    return parsed.map(item => ({
      id: crypto.randomUUID(),
      ...item
    }));
  } catch (error) {
    console.error("Bank parsing error:", error);
    throw error;
  }
};

export const generateFinancialAdvice = async (
  query: string, 
  transactions: Transaction[], 
  contacts: Contact[],
  campaigns: Campaign[],
  bankTransactions: BankTransaction[]
): Promise<{ text: string; functionCalls?: any[] }> => {
  const ai = getAiClient();
  if (!ai) return { text: "API Key is missing." };

  const contextData = `
    Global Financial Summary: ${transactions.length} items.
    Unmatched Bank Transactions: ${bankTransactions.filter(bt => !bt.matchedTransactionId).length} items.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Context Summary: ${contextData}\n\nUser Query: ${query}`,
      config: {
        systemInstruction: `You are JARVIS. Assist with ledger management. Use tools for updates.`,
        tools: [{ functionDeclarations: [updateStatusTool, reconcileTool] }]
      }
    });

    return {
      text: response.text || "Processed.",
      functionCalls: response.functionCalls
    };
  } catch (error) {
    return { text: "AI Service temporarily unavailable." };
  }
};

export const parseContractForDeliverables = async (base64Data: string, mimeType: string): Promise<Deliverable[]> => {
  const ai = getAiClient();
  if (!ai) return [];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: `Extract all advertising deliverables from this contract. 
          
          STRICT RULES:
          1. DECOMPOSE BUNDLES: Do NOT return a single item for a "Package". If a package contains "6 TikToks and 2 Events", you MUST return TWO SEPARATE objects (one for TikToks with qty 6, one for Events with qty 2).
          2. ATOMIC UNITS: Every object must represent a single type of task.
          3. QUANTITIES: Look for phrases like "6x", "Total of 5", "Quantity: 3". Extract the number accurately.
          4. UNIT RATES: If the contract shows a total price for the bundle, divide it by the quantity to get the individual unit rate.
          5. NO GROUPING: Never use commas to list multiple different deliverable types in one "name" field.
          
          Example: "Campaign Package ($36,000): 6 TikToks" -> Name: "TikTok Video", Qty: 6, Rate: 6000.` }
        ]
      },
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Atomic name of the service (e.g. TikTok Video)' },
              rate: { type: Type.NUMBER, description: 'Individual unit rate' },
              quantity: { type: Type.NUMBER, description: 'Total number of these items' },
              currency: { type: Type.STRING, description: 'Currency code' },
              platform: { type: Type.STRING, description: 'Platform name' }
            },
            required: ['name', 'rate', 'quantity']
          }
        }
      }
    });
    
    let rawItems = cleanJsonResponse(response.text);
    if (!Array.isArray(rawItems)) return [];

    return rawItems.map((item: any) => ({
      id: crypto.randomUUID(),
      name: item.name || 'Unknown Deliverable',
      rate: Number(item.rate) || 0,
      quantity: Number(item.quantity) || 1,
      currency: item.currency || 'AED',
      platform: item.platform || 'General',
      status: 'Pending',
      isCompleted: false
    }));
  } catch (e) { 
    console.error("Contract parsing error:", e);
    return []; 
  }
};

export const parseCompanyDocument = async (base64Data: string, mimeType: string): Promise<Partial<Contact>> => {
  const ai = getAiClient();
  if (!ai) return {};
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: `Extract company info (Name, Email, TRN). Return JSON.` }
        ]
      },
      config: { responseMimeType: "application/json" }
    });
    return cleanJsonResponse(response.text) || {};
  } catch (e) { return {}; }
};

export const generateQuote = async (inputText: string, base64Doc: string | null, mimeType: string | null, rateCard: ParsedRateItem[]): Promise<QuotationResponse> => {
  const ai = getAiClient();
  if (!ai) throw new Error("AI not ready");
  const parts: any[] = [{ text: `Generate quote based on: ${inputText}` }];
  if (base64Doc && mimeType) parts.push({ inlineData: { data: base64Doc, mimeType } });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: { responseMimeType: "application/json" }
  });
  return cleanJsonResponse(response.text) || { clientName: 'New Client', items: [], total: 0, notes: '' };
};
