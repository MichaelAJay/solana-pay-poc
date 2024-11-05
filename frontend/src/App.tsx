import React, { useState } from 'react';
import './App.css';
import BuyThing from './BuyThing';
import DisplayQR from './DisplayQR';

function App() {
  const [paymentUrl, setPaymentUrl] = useState('');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen m-4 p-4">
      {paymentUrl ? <DisplayQR url={paymentUrl} clearUrl={setPaymentUrl} /> : <BuyThing onUrlGenerated={setPaymentUrl} />}
    </div>
  );
}

export default App;
