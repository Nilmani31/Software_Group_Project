require('dotenv').config();
const apiKey = process.env.GEMINI_API_KEY;
async function checkModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch(e) {
        console.error(e);
    }
}
checkModels();
