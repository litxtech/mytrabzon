// Backend Test Script
// Bu script'i çalıştırmak için: node test-backend.js

const BACKEND_URL = 'https://3b6137c9-9f4e-4971-a4d1-f4410f1a6a2c-00-rgv4vnjcpau4.sisko.replit.dev';

async function testBackend() {
  console.log('🔍 Backend test başlatılıyor...\n');

  // Test 1: Root endpoint
  try {
    console.log('1️⃣ Root endpoint test ediliyor...');
    const rootResponse = await fetch(`${BACKEND_URL}/`);
    const rootText = await rootResponse.text();
    
    console.log(`   Status: ${rootResponse.status}`);
    console.log(`   Content-Type: ${rootResponse.headers.get('content-type')}`);
    console.log(`   Response: ${rootText.substring(0, 100)}...`);
    
    if (rootText.includes('{"status":"ok"')) {
      console.log('   ✅ Root endpoint çalışıyor!\n');
    } else {
      console.log('   ❌ Root endpoint beklenen yanıtı döndürmüyor!\n');
    }
  } catch (error) {
    console.log(`   ❌ Root endpoint hatası: ${error.message}\n`);
  }

  // Test 2: tRPC endpoint
  try {
    console.log('2️⃣ tRPC endpoint test ediliyor...');
    const trpcResponse = await fetch(`${BACKEND_URL}/api/trpc/user.getProfile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const trpcText = await trpcResponse.text();
    
    console.log(`   Status: ${trpcResponse.status}`);
    console.log(`   Content-Type: ${trpcResponse.headers.get('content-type')}`);
    console.log(`   Response: ${trpcText.substring(0, 200)}...`);
    
    if (trpcText.startsWith('{') || trpcText.startsWith('[')) {
      console.log('   ✅ tRPC endpoint JSON döndürüyor!\n');
    } else if (trpcText.includes('<html') || trpcText.includes('<!DOCTYPE')) {
      console.log('   ❌ tRPC endpoint HTML döndürüyor (Backend çalışmıyor!)\n');
    } else {
      console.log('   ⚠️ tRPC endpoint beklenmeyen yanıt döndürüyor\n');
    }
  } catch (error) {
    console.log(`   ❌ tRPC endpoint hatası: ${error.message}\n`);
  }

  console.log('📋 Özet:');
  console.log('   - Backend çalışıyorsa: Root ve tRPC endpoint\'leri JSON döndürmeli');
  console.log('   - Backend çalışmıyorsa: HTML veya hata sayfası döndürür');
  console.log('\n💡 Backend\'i başlatmak için:');
  console.log('   npm run start-web');
  console.log('   veya');
  console.log('   bun run start-web');
}

testBackend();

