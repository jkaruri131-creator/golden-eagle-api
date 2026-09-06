const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req,res)=> res.json({ok:true, code:'MPESA'}));

app.post('/withdraw', async (req,res)=>{
  try{
    let {amount, account_number, account_name} = req.body;
    let phone = String(account_number).replace(/\D/g,'').replace(/^0/,'');
    if(!phone.startsWith('254')) phone='254'+phone;
    const SECRET = process.env.PAYSTACK_SECRET;
    
    const r = await fetch('https://api.paystack.co/transferrecipient',{
      method:'POST',
      headers:{Authorization:'Bearer '+SECRET,'Content-Type':'application/json'},
      body: JSON.stringify({type:'mobile_money',name:account_name||'User',account_number:phone,bank_code:'MPESA',currency:'KES'})
    });
    const d = await r.json();
    if(!d.status) return res.json({success:false,error:d.message,full:d});
    
    const t = await fetch('https://api.paystack.co/transfer',{
      method:'POST',
      headers:{Authorization:'Bearer '+SECRET,'Content-Type':'application/json'},
      body: JSON.stringify({source:'balance',amount:Math.floor(Number(amount)*100),recipient:d.data.recipient_code,reason:'Payout'})
    });
    const td = await t.json();
    res.json(td.status?{success:true,data:td.data}:{success:false,error:td.message,full:td});
  }catch(e){res.json({success:false,error:e.message});}
});

app.listen(process.env.PORT||10000,'0.0.0.0',()=>console.log('Live'));
