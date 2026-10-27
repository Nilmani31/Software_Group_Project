require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const tools = [{
    functionDeclarations: [{
        name: "testFunction",
        description: "A test function",
    }]
}];

async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite", tools: tools });
        await model.generateContent("hi");
        console.log(`✅ gemini-3.5-flash-lite works!`);
    } catch (err) {
        console.log(`❌ gemini-3.5-flash-lite failed: ${err.message}`);
    }
}
run();
