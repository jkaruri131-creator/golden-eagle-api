const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req,res)=> res.json({status:'Golden Eagle API Live'}));

app.post('/withdraw', async (req,res)=>{
  try{
    const { amount, account_number, account_name, bank_code } = req.body;
    const secret = process.env.PAYSTACK_SECRET;
    if(!secret) return res.status(500).json({success:false, error:'PAYSTACK_SECRET not set'});

    const recRes = await axios.post('https://api.paystack.co/transferrecipient', {
      type: 'nuban',
      name: account_name || 'Golden Eagle User',
      account_number: account_number,
      bank_code: bank_code || '011',
      currency: 'KES'
    },{
      headers:{ Authorization: `Bearer ${secret}`, 'Content-Type':'application/json' }
    });

    const recipient_code = recRes.data.data.recipient_code;

    const transRes = await axios.post('https://api.paystack.co/transfer', {
      source: 'balance',
      amount: Math.round(Number(amount)*100),
      recipient: recipient_code,
      reason: 'Golden Eagle Withdrawal'
    },{
      headers:{ Authorization: `Bearer ${secret}`, 'Content-Type':'application/json' }
    });

    res.json({success:true, message:'Withdrawal initiated', data: transRes.data.data});
  }catch(e){
    res.status(400).json({success:false, error: e.response?.data?.message || e.message});
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('Running on '+PORT));
