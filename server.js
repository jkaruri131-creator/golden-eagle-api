const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Golden Eagle API Live', mpesa: '07 & 01 Supported' });
});

app.post('/withdraw', async (req, res) => {
  try {
    const { amount, account_number, account_name } = req.body;
    console.log('Withdraw request:', req.body);
    
    if (!amount || !account_number) {
      return res.json({ success: false, error: 'amount and account_number required' });
    }
    
    // Clean phone: support 07 and 01 -> 2547 and 2541
    let phone = String(account_number).replace(/\s/g,'').replace(/\+/g,'');
    phone = phone.replace(/^0+/, '');
    if (!phone.startsWith('254')) phone = '254' + phone;
    
    console.log('Clean phone:', phone, 'Amount:', amount);
    
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;
    if (!PAYSTACK_SECRET) {
      return res.json({ success: false, error: 'PAYSTACK_SECRET not set in Render' });
    }
    
    // 1. Create recipient - M-Pesa Kenya
    const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'mobile_money',
        name: account_name || 'DIAMINES User',
        account_number: phone,
        bank_code: 'MPESA',
        currency: 'KES'
      })
    });
    
    const recipientData = await recipientRes.json();
    console.log('Recipient:', JSON.stringify(recipientData));
    
    if (!recipientData.status) {
      // Try fallback with MPS
      if (recipientData.message && recipientData.message.includes('Bank')) {
        return res.json({ success: false, error: 'Bank is invalid - Paystack needs M-Pesa enabled. Go to Paystack Dashboard > Settings > Preferences > Enable Mobile Money. Or try bank_code MPS' });
      }
      return res.json({ success: false, error: 'Recipient Error: ' + recipientData.message });
    }
    
    const recipientCode = recipientData.data.recipient_code;
    
    // 2. Transfer
    const transferRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.floor(Number(amount) * 100),
        recipient: recipientCode,
        reason: 'DIAMINES Withdrawal'
      })
    });
    
    const transferData = await transferRes.json();
    console.log('Transfer:', JSON.stringify(transferData));
    
    if (transferData.status) {
      res.json({ success: true, data: transferData.data });
    } else {
      res.json({ success: false, error: transferData.message });
    }
    
  } catch (e) {
    console.error('Error:', e);
    res.json({ success: false, error: e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`API Live on ${PORT}`));
