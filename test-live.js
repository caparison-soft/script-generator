const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jrrxfenyouqbarwfwalu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpycnhmZW55b3VxYmFyd2Z3YWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjQzMzEsImV4cCI6MjA5MzU0MDMzMX0.XIhIr8t6eUL5nPxGFVZSe-GA6u3qALg6hTOyhG8IBEU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testLiveApi() {
  // 1. Sign up a dummy user to get an access token
  const email = `testuser_${Date.now()}@example.com`;
  const password = 'testpassword123';
  
  console.log('Signing up dummy user...');
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authErr) {
    console.error('Auth Error:', authErr.message);
    return;
  }

  const token = authData.session.access_token;
  console.log('Got token:', token.substring(0, 20) + '...');

  // 2. Make request to the live script-generator
  console.log('\nSending POST request to live Vercel API...');
  try {
    const res = await fetch('https://script-generator-psi-lyart.vercel.app/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sb-jrrxfenyouqbarwfwalu-auth-token=${encodeURIComponent(JSON.stringify(["access_token", token, "refresh_token", authData.session.refresh_token]))}`,
        // Wait, the API route uses Supabase SSR, which reads the session from cookies.
        // Let's just try sending it directly or formatting the cookie exactly as Supabase expects.
      },
      body: JSON.stringify({
        topic: 'A test video about AI',
        duration: 1
      })
    });

    const status = res.status;
    const text = await res.text();
    
    console.log(`\nResponse Status: ${status}`);
    console.log(`Response Body: ${text}`);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testLiveApi();
