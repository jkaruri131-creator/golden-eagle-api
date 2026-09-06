const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req,res)=> res.send('Golden Eagle API Live'));

app.post('/withdraw', async (req, res) => {
  try {
    let { amount, account_number, account_name } = req.body;
    let phone = String(account_number).replace(/\+/g,'').replace(/^0/,'');
    if(!phone.startsWith('254')) phone = '254'+phone;
    const SECRET = process.env.PAYSTACK_SECRET;
    const r = await fetch('https://api.paystack.co/transferrecipient', {
      method:'POST',
      headers:{ 'Authorization':`Bearer ${SECRET}`, 'Content-Type':'application/json'},
      body: JSON.stringify({type:'mobile_money', name:account_name||'User', account_number:phone, bank_code:'MPS', currency:'KES'})
    });
    const d = await r.json();
    if(!d.status) return res.json({success:false, error:d.message});
    const t = await fetch('https://api.paystack.co/transfer', {
      method:'POST',
      headers:{ 'Authorization':`Bearer ${SECRET}`, 'Content-Type':'application/json'},
      body: JSON.stringify({source:'balance', amount:Math.floor(amount*100), recipient:d.data.recipient_code, reason:'Withdrawal'})
    });
    const tData = await t.json();
    res.json(tData.status ? {success:true, data:tData.data} : {success:false, error:tData.message});
  }catch(e){ res.json({success:false, error:e.message}); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', ()=> console.log('Live on '+PORT));
