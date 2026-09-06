const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req,res)=> res.json({status:'Live - Bank Debug'}));

app.post('/withdraw', async (req,res)=>{
  try{
    let {amount, account_number, account_name} = req.body;
    let phone = String(account_number).replace(/\D/g,'').replace(/^0/,'');
    if(!phone.startsWith('254')) phone='254'+phone;
    const SECRET = process.env.PAYSTACK_SECRET;
    console.log('REQ phone:',phone,'amt:',amount);
    
    const bankRes = await fetch('https://api.paystack.co/bank?currency=KES', {headers:{Authorization:'Bearer '+SECRET}});
    const bankData = await bankRes.json();
    console.log('BANKS LIST:', JSON.stringify(bankData).substring(0,3000));
    
    const tryCodes = ['MPS','MPESA'];
    for(let code of tryCodes){
      console.log('TRYING CODE:',code);
      const r = await fetch('https://api.paystack.co/transferrecipient',{
        method:'POST',
        headers:{Authorization:'Bearer '+SECRET,'Content-Type':'application/json'},
        body: JSON.stringify({type:'mobile_money',name:account_name||'User',account_number:phone,bank_code:code,currency:'KES'})
      });
      const d = await r.json();
      console.log('RESULT '+code+':',JSON.stringify(d));
      if(d.status){
        const t = await fetch('https://api.paystack.co/transfer',{
          method:'POST',
          headers:{Authorization:'Bearer '+SECRET,'Content-Type':'application/json'},
          body: JSON.stringify({source:'balance',amount:Math.floor(Number(amount)*100),recipient:d.data.recipient_code,reason:'Payout'})
        });
        const td = await t.json();
        console.log('TRANSFER:',JSON.stringify(td));
        return res.json(td.status?{success:true,used:code,data:td.data}:{success:false,error:td.message,full:td});
      }
    }
    res.json({success:false,error:'Bank invalid - check BANKS LIST log',banks:bankData});
  }catch(e){console.log('CATCH',e.message);res.json({success:false,error:e.message});}
});

app.listen(process.env.PORT||10000,'0.0.0.0',()=>console.log('Live on '+(process.env.PORT||10000)));
