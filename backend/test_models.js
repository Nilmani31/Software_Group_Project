require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
    try {
        console.log("Fetching models...");
        // This is a hacky way to test a few known model names
        const modelsToTest = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-3.8-flash"];
        for (const name of modelsToTest) {
            try {
                const t0 = Date.now();
                const model = genAI.getGenerativeModel({ model: name });
                const res = await model.generateContent("Say hello in one word");
                console.log(`✅ ${name} works in ${Date.now() - t0}ms: ${res.response.text().trim()}`);
            } catch (err) {
                console.log(`❌ ${name} failed: ${err.message}`);
            }
        }
    } catch(e) {
        console.error(e);
    }
}
run();
