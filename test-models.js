const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const genAI = new GoogleGenerativeAI('AIzaSyCP3LFJ7rhb8PFc8tf1LLGC--uKjLX7uL8');
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('hello');
    console.log('Success!', result.response.text());
  } catch (err) {
    console.error('Error with gemini-1.5-flash:', err.message);
  }

  // Let's list models using REST API
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyCP3LFJ7rhb8PFc8tf1LLGC--uKjLX7uL8');
    const data = await res.json();
    console.log('\nAvailable Models:');
    data.models.filter(m => m.supportedGenerationMethods.includes('generateContent')).forEach(m => {
      console.log(m.name);
    });
  } catch(e) {
    console.error('List error:', e);
  }
}

test();
