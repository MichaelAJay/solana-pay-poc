import React, { useEffect, useRef } from 'react';
import { createQR } from '@solana/pay';

function DisplayQR({ url, clearUrl }: { url: string, clearUrl: (url: string) => void}) {
    const qrRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (qrRef.current) {
            qrRef.current.innerHTML = '';
            const qr = createQR(url, 300);
            qr.append(qrRef.current);
        }
    }, [url]);

    const handleClick = () => {
        clearUrl('');
    }

    return (
        <div className="mt-8 p-4 border border-gray-200 rounded-lg">
            <div ref={qrRef}/>
            <button onClick={handleClick}>Clear</button>
        </div>
    )
};

export default DisplayQR;