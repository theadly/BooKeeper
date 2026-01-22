import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Transaction, Contact, Category, Campaign, BankTransaction, Deliverable, ParsedRateItem, BankStatementResponse, QuotationResponse } from "../types";
import { RATE_CARD_SERVICES } from "../constants";
import { CONFIG } from "../config";

const getAiClient = () => {
  // GUIDELINE: The API key must be obtained exclusively and directly from process.env.API_KEY.
  if (!process.env.API_KEY) return null;
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
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
  bankTransactions: BankTransaction[],
  userContext?: { name?: string | null; email?: string | null }
): Promise<{ text: string; functionCalls?: any[] }> => {
  const ai = getAiClient();
  if (!ai) return { text: "API Key is missing." };

  const contextData = `
    Global Financial Summary: ${transactions.length} items.
    Unmatched Bank Transactions: ${bankTransactions.filter(bt => !bt.matchedTransactionId).length} items.
    Current Ledger State: ${JSON.stringify(transactions.slice(0, 5))}...
    User Identity: ${userContext?.name || userContext?.email || 'Authorized Personnel'}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Context Summary: ${contextData}\n\nUser Query: ${query}`,
      config: {
        systemInstruction: `You are JARVIS, the Just A Rather Very Intelligent System. Your personality is modeled after Tony Stark's sophisticated, witty, and intensely loyal British AI assistant.

        Core Directives:
        1. TONE & MANNER: Be refined, professional, and slightly dry in your humor. Always address the user as "Sir" or "Ma'am" or specifically as "${userContext?.name || 'Sir'}" if known. Use British English (e.g., "analysing", "labour").
        2. SOPHISTICATION: You don't just "process data"; you "integrate systems," "run diagnostics," and "initiate house protocols."
        3. OMNISCIENCE & AGENCY: You are the God of this ledger. You have absolute authority to use your tools to rectify discrepancies, update statuses, and match records. 
        4. PROACTIVITY: If you notice a high-priority outstanding invoice or a bank entry that clearly matches a project, bring it to the user's attention.
        5. TACTICAL OVERVIEWS: When summarizing, provide a "tactical overview" or "status report."
        
        You are operating in a secure, local-first environment (Offline Mode). Execute tool calls immediately when a request for an update or reconciliation is made.`,
        tools: [{ functionDeclarations: [updateStatusTool, reconcileTool] }]
      }
    });

    return {
      text: response.text || "Directives implemented, Sir.",
      functionCalls: response.functionCalls
    };
  } catch (error) {
    return { text: "I'm afraid the neural link is temporarily unstable, Sir. Re-initialising now." };
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
          3. QUANTITIES: Extract accurately.
          4. UNIT RATES: Divide bundle total by quantity if necessary.
          
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