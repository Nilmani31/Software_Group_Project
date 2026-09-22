require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
    try {
        console.log("Fetching models...");
        // This is a hacky way to test a few known model names
        const modelsToTest = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro", "gemini-1.5-pro", "gemini-1.0-pro"];
        for (const name of modelsToTest) {
            try {
                const model = genAI.getGenerativeModel({ model: name });
                const res = await model.generateContent("hi");
                console.log(`✅ ${name} works!`);
            } catch (err) {
                console.log(`❌ ${name} failed: ${err.message}`);
            }
        }
    } catch(e) {
        console.error(e);
    }
}
run();
