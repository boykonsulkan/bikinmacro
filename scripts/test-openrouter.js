const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = envFile.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {});

const apiKey = env['OPENROUTER_API_KEY'];

async function main() {
  const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  const data = await res.json();
  console.log('Auth Key Info:', JSON.stringify(data, null, 2));

  const resModels = await fetch('https://openrouter.ai/api/v1/models');
  const modelsData = await resModels.json();
  console.log(`Found ${modelsData.data?.length} models.`);
  // print first 2 models
  console.log('Sample model:', JSON.stringify(modelsData.data?.[0], null, 2));
}

main();
