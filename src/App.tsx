import { useState } from 'react';
import { WagmiConfig } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { wagmiConfig } from './config/payment';
import { Toaster } from 'react-hot-toast';
import PaymentVerification from './components/PaymentVerification';

import { Navbar } from './components/Navbar';
import ChartAdapter from './components/ChartAdapter';
import { BuySignalsPanel } from './components/BuySignalsPanel';
import { Wget } from './components/Chart';
import { CryptoData } from './types';
import '@rainbow-me/rainbowkit/styles.css';
import { DataProvider } from './context/DataContext';
import SimplifiedLayout from './components/SimplifiedLayout';

function App() {
  const [selectedRange, setSelectedRange] = useState("Top 100");
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoData | null>(null);

  function handleBubbleClick(crypto: CryptoData): void {
    setSelectedCrypto(crypto);
  }

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider modalSize="compact">
        <DataProvider>
          <Router>
            <Toaster />
            <PaymentVerification />
            <Routes>
              <Route path="/" element={
                <SimplifiedLayout rightPanel={<BuySignalsPanel />}>
                  <div className="flex-1 flex flex-col">
                    <Navbar onRangeChange={setSelectedRange} />
                    <div className="flex-1 p-6">
                      <div className="w-full h-full">
                        <ChartAdapter 
                          selectedRange={selectedRange}
                          onBubbleClick={handleBubbleClick}
                        />
                        {selectedCrypto && (
                          <Wget onClose={() => setSelectedCrypto(null)}/>
                        )}
                      </div>
                    </div>
                  </div>
                </SimplifiedLayout>
              } />
            </Routes>
          </Router>
        </DataProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;