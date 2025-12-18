
import { GoogleGenAI, Type, GenerateContentParameters } from "@google/genai";
import { Transaction, Contact, Category, Campaign, BankTransaction, Deliverable, ParsedRateItem, BankStatementResponse, QuotationResponse } from "../types";
import { RATE_CARD_SERVICES } from "../constants";
import { CONFIG } from "../config";

const getAiClient = () => {
  if (!CONFIG.API_KEY) return null;
  return new GoogleGenAI({ apiKey: CONFIG.API_KEY });
};

interface YearlyStat {
  income: number;
  fees: number;
  count: number;
}

export const generateFinancialAdvice = async (
  query: string, 
  transactions: Transaction[], 
  contacts: Contact[],
  campaigns: Campaign[]
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "API Key is missing. Please check your configuration.";

  const yearlySummary = transactions.reduce<Record<number, YearlyStat>>((acc, t) => {
    const year = t.year;
    if (!acc[year]) acc[year] = { income: 0, fees: 0, count: 0 };
    if (t.type === 'Income') {
      acc[year].income += t.amount;
      acc[year].fees += (t.fee || 0);
    }
    acc[year].count += 1;
    return acc;
  }, {});

  const projectsInLedger = campaigns.map(c => c.projectName);

  const contextData = `
    Global Financial Summary (All Years):
    ${JSON.stringify(yearlySummary)}
    
    Current Projects/Campaigns in Ledger:
    ${projectsInLedger.join(', ')}

    Detailed Transaction Log (Sample):
    ${JSON.stringify(transactions.slice(-15))}

    CRM Pipeline:
    - Total Contacts: ${contacts.length}
    - Pipeline Value: $${contacts.reduce((sum, c) => sum + c.potentialValue, 0)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Context Data:\n${contextData}\n\nUser Query:\n${query}`,
      config: {
        systemInstruction: `You are Jarvis, an expert personal accountant assistant. 
        1. Always use the Global Financial Summary for questions about total fees or revenue for past years. 
        2. When mentioning a project found in the "Current Projects" list, wrap it as [Campaign:PROJECT_NAME].
        3. Be concise, professional, and provide clear breakdowns.`,
      }
    });
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini financial advice error:", error);
    return "Sorry, I encountered an error while processing your request.";
  }
};

export const parseBankStatement = async (base64Data: string, mimeType: string): Promise<BankTransaction[]> => {
  const ai = getAiClient();
  if (!ai) return [];
  const validCategories = Object.values(Category).join(', ');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: `List every transaction. Assign a 'category' from: [${validCategories}]. Return JSON array.` }
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
            }
          }
        }
      }
    });
    
    if (!response.text) return [];
    const parsed = JSON.parse(response.text) as BankStatementResponse[];
    return parsed.map(item => ({
      id: crypto.randomUUID(),
      ...item
    }));
  } catch (error) {
    console.error("Bank statement parsing error:", error);
    return [];
  }
};

export const parseRateCard = async (base64Data: string, mimeType: string): Promise<ParsedRateItem[]> => {
  const ai = getAiClient();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: `Read this Rate Card and extract all services and their prices. Return a clean JSON array of objects with 'name', 'rate' (number), and 'unit' (if applicable).` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              rate: { type: Type.NUMBER },
              unit: { type: Type.STRING }
            },
            required: ['name', 'rate']
          }
        }
      }
    });
    return JSON.parse(response.text || "[]") as ParsedRateItem[];
  } catch (error) {
    console.error("Rate Card Parsing Error:", error);
    return [];
  }
};

export const generateQuote = async (
  inputText: string, 
  base64Doc: string | null, 
  mimeType: string | null, 
  rateCard: ParsedRateItem[]
): Promise<QuotationResponse> => {
  const ai = getAiClient();
  const fallback: QuotationResponse = { clientName: 'Error', items: [], total: 0, notes: 'Failed to generate quote.' };
  
  if (!ai) return fallback;

  const rateCardText = rateCard.map(r => `${r.name}: ${r.rate} ${r.unit || ''}`).join('\n');
  const parts: any[] = [{ text: `Based on the following Rate Card:\n${rateCardText}\n\nAnd the user input/document:\n${inputText}` }];
  
  if (base64Doc && mimeType) {
    parts.push({ inlineData: { data: base64Doc, mimeType } });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        systemInstruction: "Create a formal quotation. Extract deliverables and match them to the rate card prices where possible. If a service is not in the rate card, estimate based on similar items. Return JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clientName: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  rate: { type: Type.NUMBER },
                  quantity: { type: Type.NUMBER },
                  currency: { type: Type.STRING },
                  platform: { type: Type.STRING }
                },
                required: ['id', 'name', 'rate', 'quantity', 'currency']
              }
            },
            total: { type: Type.NUMBER },
            notes: { type: Type.STRING }
          },
          required: ['clientName', 'items', 'total']
        }
      }
    });
    return JSON.parse(response.text || "{}") as QuotationResponse;
  } catch (error) {
    console.error("Quote Generation Error:", error);
    return fallback;
  }
};

export const parseContractForDeliverables = async (base64Data: string, mimeType: string): Promise<Deliverable[]> => {
  const ai = getAiClient();
  if (!ai) return [];

  const rateCardContext = RATE_CARD_SERVICES.map(s => `${s.name} (Rate: ${s.rate})`).join(', ');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: `Read this contract and extract all deliverables/services. 
                   Try to map items to these standard services: [${rateCardContext}].
                   CRITICAL: If a deliverable has a quantity greater than 1 (e.g., "6 Videos"), return each video as a separate individual item in the array. 
                   For example, instead of 1 item with quantity 6, return 6 items with quantity 1.
                   Append a suffix like "1/6", "2/6" etc. to the name of each exploded item.
                   Assign a random ID string to each. Status should be 'Pending'.` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              rate: { type: Type.NUMBER },
              quantity: { type: Type.NUMBER },
              currency: { type: Type.STRING },
              status: { type: Type.STRING, enum: ['Pending', 'In Progress', 'Completed'] }
            },
            required: ['id', 'name', 'rate', 'quantity', 'currency', 'status']
          }
        }
      }
    });
    return JSON.parse(response.text || "[]") as Deliverable[];
  } catch (error) {
    console.error("Contract Parsing Error:", error);
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
          { text: `Extract company information from this Trade License or VAT Certificate. 
                   Look for: Legal Company Name, Email, Phone number, and TRN (Tax Registration Number). 
                   If any are missing, leave them empty. 
                   Assign a potentialValue of 0. Return as JSON object.` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            company: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            trn: { type: Type.STRING },
            name: { type: Type.STRING, description: "Extract individual contact person name if available, otherwise use company name" },
            notes: { type: Type.STRING, description: "Summary of license validity or business activities" }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}") as Partial<Contact>;
  } catch (error) {
    console.error("Document Parsing Error:", error);
    return {};
  }
};
