// Edge Functions Test Script (Node.js)
// Terminal'de çalıştırın: node test-edge-function.js

const BASE_URL = "https://xcvcplwimicylaxghiak.supabase.co/functions/v1";
const TOKEN = "YOUR_TOKEN_HERE"; // Token'ınızı buraya yapıştırın

// ============================================
// TEST FONKSİYONLARI
// ============================================

async function testFunction(name, endpoint, body = null) {
  console.log(`\n🧪 Testing ${name}...`);
  
  const url = `${BASE_URL}/${endpoint}`;
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Error:', response.status, response.statusText);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// ============================================
// TESTLER
// ============================================

async function runTests() {
  console.log('\n📋 Edge Functions Test Script');
  console.log('==============================\n');
  
  if (TOKEN === "YOUR_TOKEN_HERE") {
    console.log('⚠️  UYARI: Token\'ı güncelleyin!');
    console.log('Script dosyasında TOKEN değişkenini düzenleyin.\n');
    return;
  }
  
  // Chat Get Rooms
  await testFunction(
    'chat-get-rooms',
    'chat-get-rooms/api/trpc/getRooms',
    { limit: 10, offset: 0 }
  );
  
  // Chat Get Messages (roomId gerekli)
  // await testFunction(
  //   'chat-get-messages',
  //   'chat-get-messages/api/trpc/getMessages',
  //   { roomId: 'ROOM_ID_HERE', limit: 50, offset: 0 }
  // );
  
  // KYC Get
  await testFunction(
    'kyc-get',
    'kyc-get/api/trpc/get'
  );
  
  console.log('\n✅ All tests completed!');
}

// Çalıştır
runTests();

