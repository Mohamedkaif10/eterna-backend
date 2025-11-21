import axios from 'axios';
import WebSocket from 'ws';

async function testOrderFlow() {
  try {
    console.log("1. Sending POST request to create order...");
    

    const response = await axios.post('http://localhost:3000/api/orders/execute', {
      baseToken: "SOL",
      quoteToken: "USDC",
      side: "buy",
      amount: 1.5
    });

    const orderId = response.data.orderId;
    console.log(`2. Order Created! ID: ${orderId}`);

   
    console.log(`3. Connecting to WebSocket: ws://localhost:3000/api/orders/updates/${orderId}`);
    const ws = new WebSocket(`ws://localhost:3000/api/orders/updates/${orderId}`);

    ws.on('open', () => {
      console.log('WebSocket Connected!');
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      
      
      if (msg.step) {
        console.log(`\n[STEP ${msg.step}/${msg.totalSteps}] ${msg.status.toUpperCase()}`);
        console.log(`   Message: ${msg.message}`);
        if (msg.routingLog) console.log("   📊 Route info received");
      } else {
        console.log(`\n📩 Update:`, msg);
      }

      if (msg.status === 'confirmed' || msg.status === 'failed') {
        console.log("\n🏁 Final State Reached. Closing connection.");
        ws.close();
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });

  } catch (error) {
    console.error("Error in test:", error);
  }
}

testOrderFlow();