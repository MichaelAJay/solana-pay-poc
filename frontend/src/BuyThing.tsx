import React, { useState } from 'react';
import axiosInstance from './axios.singleton';
import { AxiosError } from 'axios';

interface BuyThingProps {
    onUrlGenerated: (url: string) => void;
}

function BuyThing({ onUrlGenerated }: BuyThingProps) {
    const [amount, setAmount] = useState(0);
    const [denomination, setDenomination] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: { preventDefault: () => void; }) => {
        event?.preventDefault();
        if (amount <= 0) {
            alert('Amount must be greater than 0');
            return;
        }

        setLoading(true);
        
        try {
            // Create invoice
            const { data: reference } = await axiosInstance.post('/invoice', {
                amount,
                denomination,
                description
            });

            // Get payment link
            const { data: paymentLink } = await axiosInstance.get(`/invoice/payment-link/${reference}`);

            // Call the onUrlGenerated function with the payment link
            onUrlGenerated(paymentLink);
        } catch (err) {
            // debugger;
            if (err instanceof AxiosError) {
                if (err.code === 'ERR_NETWORK') {
                    console.error('Network error - ensure server is running.');
                    return;
                }
            }
            console.error('Error creating invoice or fetching payment link:', err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
            min="0.01"
            step="0.01"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Currency
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="currency"
                value="SOL"
                checked={denomination === 'SOL'}
                onChange={(e) => setDenomination(e.target.value)}
                className="form-radio"
              />
              <span className="ml-2">SOL</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="currency"
                value="SPL"
                checked={denomination === 'SPL'}
                onChange={(e) => setDenomination(e.target.value)}
                className="form-radio"
              />
              <span className="ml-2">SPL</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          disabled={loading && amount <= 0}
        >
          {loading ? 'Processing...' : 'Buy Thing'}
        </button>
      </form>
    )
};

export default BuyThing;