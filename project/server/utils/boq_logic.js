import xlsx from 'xlsx';
import axios from 'axios';

// A list of common English "stop words" to ignore during matching for better accuracy.
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'the', 'in', 'on', 'for', 'with', 'of', 'to', 'is', 'are', 'was', 'were',
  'including', 'supply', 'providing', 'of', 'all', 'complete', 'work', 'as', 'per', 'details',
  'item', 'rate', 'charges', 'fixing', 'laying'
]);

// =================================================================
//  RATE LIMITER (QUEUE) FOR FREE TIER
// =================================================================
// This simple queue ensures we don't hit the Gemini API too fast.
// It forces a minimum delay between requests.

class RateLimiter {
  constructor(minDelayMs) {
    this.queue = [];
    this.isProcessing = false;
    this.minDelayMs = minDelayMs;
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      // If it's a 429 (Too Many Requests), we could technically retry here,
      // but for simplicity, we'll just reject for now.
      reject(error);
    } finally {
      // Wait for the minimum delay before processing the next item
      setTimeout(() => {
        this.isProcessing = false;
        this.process();
      }, this.minDelayMs);
    }
  }
}

// Initialize the limiter: 1 request every 4.5 seconds (safe for free tier which is often ~15 req/min)
const aiLimiter = new RateLimiter(4500); 


/**
 * Tokenizes a string, converts to lowercase, and removes stop words.
 */
const tokenize = (text) => {
  if (!text || typeof text !== 'string') {
    return new Set();
  }
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/gi, '') // Remove punctuation
      .split(/\s+/) // Split by whitespace
      .filter(word => word.length > 2 && !STOP_WORDS.has(word))
  );
};

/**
 * --- NEW AI HELPER FUNCTION ---
 * Calls the Gemini API to get a rate suggestion for a given description and unit.
 * @param {string} description - The BOQ item description.
 * @param {string} unit - The unit of measurement for the item.
 * @param {string} geminiApiKey - The API key for the Gemini service.
 * @returns {Promise<Object|null>} A promise that resolves to an object like { rate: 8500 } or null.
 */
const getAiRateSuggestion = async (description, unit, geminiApiKey) => {
    if (!geminiApiKey) {
        console.warn("Gemini API key not provided; skipping AI suggestion.");
        return null;
    }

    const prompt = `
      You are an expert quantity surveyor in India. For the BOQ item description below, provide an estimated market rate in Indian Rupees (INR) for the specified unit of measurement.
      - Analyze the description to understand the work involved.
      - Consider standard Indian construction costs.
      - Respond ONLY with a valid JSON object in the format: {"rate": <number>}
      - Do not include any other text, explanations, or markdown formatting.

      **Description:** "${description}"
      **Unit of Measurement:** "${unit}"
    `;

    // Use the stable 1.5 Flash model
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiApiKey}`;

    try {
        const response = await axios.post(geminiApiUrl, {
            contents: [{ parts: [{ text: prompt }] }]
        });

        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) return null;

        // Clean the response to ensure it's valid JSON
        const jsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonText);
        
        if (parsed && typeof parsed.rate === 'number') {
            return { rate: parsed.rate };
        }
        return null;

    } catch (error) {
        // Log error but don't crash, just return null so the item gets processed without a rate
        console.error(`❌ Error fetching AI rate suggestion for "${description.substring(0, 15)}...":`, error.response?.data?.error?.message || error.message);
        return null;
    }
};


/**
 * The core function to parse an Excel file buffer, match items, and calculate totals.
 * Now includes AI-powered rate suggestions for unmatched items.
 * @param {Buffer} fileBuffer - The buffer of the uploaded .xlsx file.
 * @param {Array<Object>} ratesData - An array of rate objects from the database.
 * @param {string} geminiApiKey - The API key for the Gemini service.
 * @returns {Promise<{processedItems: Array<Object>, projectTotal: number}>} An object containing the list of processed items and the final project total.
 */
export const parseAndMatchBOQ = async (fileBuffer, ratesData, geminiApiKey) => {
  const processedItems = [];
  let projectTotal = 0;

  try {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const boqData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Use a for...of loop to correctly handle async/await within the loop
    for (const row of boqData.slice(1)) { // .slice(1) to skip the header
        const item_no = String(row[0] || '').trim();
        const description = String(row[1] || '').trim();
        const quantity = parseFloat(row[2]);
        const unit = String(row[3] || '').trim().toLowerCase();

        if (!description || isNaN(quantity) || !unit) {
            continue;
        }

        let bestMatch = null;
        let highestScore = 0;
        
        // --- B. Fuzzy Rate Matching Logic ---
        const relevantRates = ratesData.filter(rate => rate.unit.toLowerCase() === unit);
        
        if (relevantRates.length > 0) {
            const descriptionTokens = tokenize(description);
            for (const rate of relevantRates) {
                const rateNameTokens = tokenize(rate.item_name);
                const keywordTokens = tokenize(rate.keywords);
                let currentScore = 0;
                
                for (const token of descriptionTokens) {
                    if (rateNameTokens.has(token)) currentScore += 2;
                    if (keywordTokens.has(token)) currentScore += 1;
                }

                if (currentScore > highestScore) {
                    highestScore = currentScore;
                    bestMatch = rate;
                }
            }
        }
        
        // --- C. Calculation & AI Integration ---
        let finalRate = null;
        let finalTotal = null;
        let isAiSuggestion = false;
        let source = 'Manual';

        if (bestMatch && highestScore > 0) {
            // MATCH FOUND LOCALLY
            finalRate = parseFloat(bestMatch.rate_value);
            source = 'Database';
        } else {
            // --- AI INTEGRATION WITH RATE LIMITER ---
            // If no local match is found, queue the call to Gemini.
            console.log(`[AI Queue] Queuing rate request for: "${description.substring(0, 30)}..."`);
            
            // Use the rate limiter to schedule the call
            const aiSuggestion = await aiLimiter.add(() => getAiRateSuggestion(description, unit, geminiApiKey));
            
            if (aiSuggestion) {
                finalRate = aiSuggestion.rate;
                isAiSuggestion = true;
                source = 'AI Estimate';
            }
        }

        if (finalRate !== null) {
            finalTotal = finalRate * quantity;
            projectTotal += finalTotal;
        }
        
        processedItems.push({
            item_no,
            description,
            quantity,
            unit,
            rate: finalRate,
            total: finalTotal,
            isAiSuggestion, // Flag for frontend highlighting
            source
        });
    }

  } catch (error) {
    console.error("Error parsing or processing BOQ Excel file:", error);
    return { processedItems: [], projectTotal: 0 };
  }

  return { processedItems, projectTotal };
};