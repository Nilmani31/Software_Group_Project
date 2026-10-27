require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const modelsToTest = [
    "antigravity-preview-latest",
    "deep-research-pro-preview-12-2025",
    "deep-research-max-preview-04-2026",
    "veo-3.1-generate-preview",
    "gemini-robotics-er-2-preview"
];

const tools = [{
    functionDeclarations: [{
        name: "testFunction",
        description: "A test function",
    }]
}];

async function run() {
    for (const name of modelsToTest) {
        try {
            const model = genAI.getGenerativeModel({ model: name, tools: tools });
            await model.generateContent("hi");
            console.log(`✅ ${name} SUPPORTS function calling!`);
        } catch (err) {
            console.log(`❌ ${name} failed: ${err.message}`);
        }
    }
}
run();
