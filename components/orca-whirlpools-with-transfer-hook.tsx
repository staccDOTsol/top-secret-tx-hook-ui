"use client";

import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Magick from "@/components/ui/magick";
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft, Droplet, Info } from "lucide-react";
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Dialog, DialogContent, DialogTitle } from '@radix-ui/react-dialog';
import { DialogHeader } from './ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@radix-ui/react-accordion';
import { AnchorProvider } from 'anchor-301'

const SOLANA_RPC_ENDPOINT = "https://rpc.ironforge.network/mainnet?apiKey=01HRZ9G6Z2A19FY8PR4RF4J4PW";
const connection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");

export function OrcaWhirlpoolsWithTransferHook() {
  const [whirlpools, setWhirlpools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingAmount, setStartingAmount] = useState("1");
  const [arbResult, setArbResult] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const wallet = useWallet();
  const aw = useAnchorWallet()
  const { publicKey, signTransaction } = wallet;
  const [arbitragePaths, setArbitragePaths] = useState<string[][]>([]);
  const [openingPosition, setOpeningPosition] = useState(false);
  const [arbitraging, setArbitraging] = useState(false);
  const connection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");
  
  const handleOpenPosition = async () => {
    if (!wallet.publicKey || !signTransaction) return;

    setOpeningPosition(true);
    try {
      const response = await fetch('/api/position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey: wallet.publicKey.toBase58(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get position opening instructions');
      }

      const { transaction: serializedTransaction,  ix: tx2, signers: serializedSigners } = await response.json();

      const transaction = Transaction.from(Buffer.from(serializedTransaction, 'base64'));
      const tx = Transaction.from(Buffer.from(tx2, 'base64'));
      const signers = serializedSigners.map((s: string) => Keypair.fromSecretKey(Buffer.from(s, 'base64')));
      if (!wallet || !wallet.signAllTransactions || !aw) return
    
      // Sign the transaction

      // Add signatures of any other required signers
        tx.partialSign(signers[0])
        console.log(signers[0].publicKey.toBase58())
        const aaa = transaction
        transaction.partialSign(signers[1])

       const signed=   await wallet.signAllTransactions([tx, transaction])
        const sig1 = await connection.sendRawTransaction(signed[0].serialize());
        await new Promise(resolve => setTimeout(resolve, 25000)); // Wait for 10 seconds
        // Simulate the transaction
        const simulationResult = await connection.simulateTransaction(signed[1]);
        
        // Extract logs from simulation
        const logs = simulationResult.value.logs;
        if (logs) {
          console.log(logs)
          const errorLog = logs.find(log => log.includes("AnchorError caused by account: position_info. Error Code: ConstraintSeeds."));
          if (errorLog) {
            const leftKey = logs[logs.indexOf(errorLog) + 2].split(": ")[1].trim();
            const rightKey = logs[logs.indexOf(errorLog) + 4].split(": ")[1].trim();
            console.log(leftKey)
            console.log(rightKey)
            // Replace the key in the transaction
            aaa.instructions.forEach(ix => {
              ix.keys.forEach(key => {
                if (key.pubkey.toBase58() === leftKey) {
                  key.pubkey = new PublicKey(rightKey);
                }
              });
            });
          }
        }
        if (!wallet.signTransaction) return 
aaa.partialSign(signers[1])
        const si = await wallet.signTransaction(aaa)
        // Send the modified transaction
        const sig2 = await connection.sendRawTransaction(si.serialize());
        await connection.confirmTransaction(sig2, "confirmed");
        setArbResult(`Transaction signatures: ${sig1}, ${sig2}`);


    } catch (error) {
      console.error('Error opening position:', error);
    } finally {
      setOpeningPosition(false);
    }
  };
  useEffect(() => {
    const fetchWhirlpools = async () => {
      try {
        const response = await fetch('/api/whirlpools');
        if (!response.ok) {
          throw new Error('Failed to fetch whirlpools');
        }
        const data = await response.json();
        const pools = data.pools || data;
        const arbPaths = data.arbitragePaths || [];
        
        // Filter pools that are in arb routes and nonoptional
        const poolsInArbRoutes = pools.filter((pool: any) =>
          (arbPaths.some((path: string[]) =>
            path.includes(pool.tokenA.mint) || path.includes(pool.tokenB.mint)
          ) && !pool.optional)
        );

        // Sort pools: non-optional first, then optional
        const sortedPools = poolsInArbRoutes.sort((a: any, b: any) => {
          if (!a.optional && b.optional) return -1;
          if (a.optional && !b.optional) return 1;
          return 0;
        });

        setWhirlpools(sortedPools);
        setArbitragePaths(arbPaths);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch whirlpools:", error);
        setLoading(false);
      }
    };

    fetchWhirlpools();
  }, []);
function calculateOutput(path: string[]): number {
  let output = parseFloat(startingAmount);
  for (let i = 0; i < path.length - 1; i++) {
    const fromToken = path[i];
    const toToken = path[i + 1];
    const edge: any = whirlpools.find((pool:any) => 
      (pool.tokenA.mint === fromToken && pool.tokenB.mint === toToken) ||
      (pool.tokenA.mint === toToken && pool.tokenB.mint === fromToken)
    );
    if (edge) {
      const price = parseFloat(edge.price);
      output *= fromToken === edge.tokenA.mint ? price : 1 / price;
    }
  }
  return output;
}
  const handleArbitrage = async () => {
    setArbitraging(true)
    if (wallet && publicKey && startingAmount) {
      for (const path of arbitragePaths.sort(() => Math.random() - 0.5)) {
      try {
        // Call the server-side API to get the transaction
        const response = await fetch('/api/arbitrage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Number(startingAmount) * 1e6, // Convert SOL amount to lamports
            path, // Sort paths by best output and use the first one
            publicKeyBase58: publicKey.toBase58(),
          }),
        });

        const data = await response.json();

        if (data.error) {
          console.error('Arbitrage failed:', data.error);
          setArbResult('Arbitrage failed: ' + data.error);
          return;
        }

        const { serializedTransactions } = data;

        // Deserialize the transactions
        const transactions = serializedTransactions.map((serializedTx: string) =>
          VersionedTransaction.deserialize(Buffer.from(serializedTx, 'base64'))
        );

        if (!wallet || !wallet.signAllTransactions) return;

        // Sign all transactions
        const signedTransactions = await wallet.signAllTransactions(transactions);

        // Send all transactions
        const signatures = await Promise.all(
          signedTransactions.map((signedTx) =>
            connection.sendRawTransaction(signedTx.serialize())
          )
        );

        // Wait for all confirmations
        await Promise.all(
          signatures.map((signature) =>
            connection.confirmTransaction(signature, 'confirmed')
          )
        );

        console.log('All transactions confirmed:');
        signatures.forEach((signature, index) => {
          console.log(`Transaction ${index + 1} signature: ${signature}`);
        });
        const transactionLinks = signatures.join(', ');

        setArbResult(`Arbitrage successful. Transaction Signatures: ${transactionLinks}`);

      } catch (error:any) {
        console.error('Error during arbitrage:', error);
        setArbResult('Arbitrage failed: ' + error.message);
      }
      setArbitraging(false)
    }
    } else {
      console.log('Wallet not connected');
    }
  };
  const toggleModal = () => setIsModalOpen(!isModalOpen);
  return (
    <div className="container mx-auto p-4 bg-gradient-to-br from-gray-900 to-gray-800 min-h-screen text-white">
      <h1 className="text-4xl font-bold mb-8 text-center text-blue-400">Orca Whirlpools with Transfer Hook</h1>
      <div className="mb-8 bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-5 sm:space-y-0">
          <WalletMultiButton className="w-full sm:w-auto mb-4 sm:mb-0 bg-blue-600 hover:bg-blue-700" />
            <Label htmlFor="startingAmount" className="whitespace-nowrap text-blue-300">Starting Amount (fomo3d.fun or rod or sommin)</Label>
            <Input
              id="startingAmount"
              type="number"
              disabled={arbitraging}
              value={startingAmount}
              onChange={(e) => setStartingAmount(e.target.value)}
              className="w-full sm:w-32 bg-gray-700 text-white"
            />
          </div>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-5 sm:space-y-0">

          <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
            <Button onClick={handleArbitrage} disabled={!wallet || arbitraging} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              {arbitraging ? 'Arbitraging...' : 'Start Arbitrage'}
            </Button>
            <Button onClick={toggleModal} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700">
              <Info className="mr-2 h-4 w-4" />
              Explain What's Happening
            </Button> <Button 
          onClick={handleOpenPosition} 
          disabled={!wallet.publicKey || openingPosition} 
          className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 mt-4"
        >
          {openingPosition ? 'Opening Position...' : 'Open Smol USDC/fomo3d demo Position'}
        </Button>
          </div>
        </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-gray-800 text-white" aria-describedby="dialog-description">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold mb-4 text-blue-400">Unique Arbitrage Opportunity</DialogTitle>
          </DialogHeader>
          <div id="dialog-description" className="text-gray-300 mb-4">
            Information about the unique arbitrage opportunity in Orca transfer hook pools
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-blue-300">Ecosystem Token Movement</AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Our system focuses on moving the ecosystem token back and forth to keep the arbitrage opportunities flowing. We're not creating or decreasing liquidity positions, just exploiting the unique characteristics of Orca transfer hook pools.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-blue-300">Fee Distribution Quirk</AccordionTrigger>
              <AccordionContent className="text-gray-300">
                There's a good chance the most recent person to move the ecosystem token gets the fees earned if a position needs to have liquidity decreased. There's an equal chance someone who has created a position might get these fees.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-blue-300">Our Unique Approach</AccordionTrigger>
              <AccordionContent className="text-gray-300">
                You're not doing any of that here though. You're just moving the ecosystem token Flywheel back and forth to keep the thing moving along!
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-blue-300">Exclusive Arbitrage Opportunities</AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Because Jupiter and Orca don't let you trade Orca transfer hook pools, this is the only place around where you can exploit these arbitrage opportunities!
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger className="text-blue-300">Continuous Flywheel Effect</AccordionTrigger>
              <AccordionContent className="text-gray-300">
                By continuously moving the ecosystem token, we keep the arbitrage flywheel in motion, creating a perpetual opportunity for profit without the need for complex liquidity provision strategies.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-blue-300">This is not an arbitrage route, it is just a tribute</AccordionTrigger>
              <AccordionContent className="text-gray-300">
              <p>
                Until we get many more pairs, this system won't know any successful arbitrage routes. 
                Right now, you're essentially playing for the chance to be the winner!
              </p>
              <p className="mt-2">
                By participating, you're helping to keep the ecosystem token moving, which is crucial 
                for maintaining the potential for arbitrage opportunities. Even though there might not 
                be immediate profits, your actions contribute to the overall health and liquidity of 
                the system.
              </p>
              <p className="mt-2">
                Think of it as buying a lottery ticket - there's a chance you could be the one who 
                benefits when the conditions are right. Your participation is valuable, as it helps 
                create the environment where future arbitrage opportunities can emerge.
              </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </DialogContent>
      </Dialog>
        {arbResult && (
          <div className="mt-4 p-4 bg-green-800 text-green-100 rounded-md">
            {arbResult}
          </div>
        )}
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[300px] w-full bg-gray-700" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {whirlpools
            .sort((a:any, b:any) => (a.optional === b.optional ? 0 : a.optional ? 1 : -1))
            .map((pool: any) => (
            <Card key={pool.address} className="overflow-hidden bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-900">
                <CardTitle className="text-lg font-medium text-blue-400">
                  {pool.tokenA.symbol}/{pool.tokenB.symbol}
                </CardTitle>
                {pool.hasTransferHook && 
                <Badge variant="secondary" className="bg-blue-600 text-white">
                  <Droplet className="h-4 w-4 mr-1" />
                  Transfer Hook
                </Badge>}
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <img src={pool.tokenA.metadata.imageUrl} alt={pool.tokenA.symbol} className="w-10 h-10 mr-3 rounded-full" />
                    <div>
                      <div className="font-semibold text-lg text-blue-300">{pool.tokenA.symbol}</div>
                      <div className="text-xs text-gray-400">{pool.tokenA.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <img src={pool.tokenB.metadata.imageUrl} alt={pool.tokenB.symbol} className="w-10 h-10 mr-3 rounded-full" />
                    <div>
                      <div className="font-semibold text-lg text-blue-300">{pool.tokenB.symbol}</div>
                      <div className="text-xs text-gray-400">{pool.tokenB.name}</div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mb-1">Pool Address</div>
                <div className="font-mono text-xs mb-4 truncate text-blue-200">{pool.address}</div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-400">TVL</div>
                    <div className="text-lg font-bold text-green-400">${pool.tvl}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Price</div>
                    <div className="text-lg font-bold text-green-400">${pool.price}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400">Tick Index</div>
                    <div className="text-lg font-bold text-purple-400">{pool.tickIndex}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Tick Spacing</div>
                    <div className="text-lg font-bold text-purple-400">{pool.tickSpacing}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-xs text-gray-400 mb-1">Liquidity</div>
                  <div className="font-mono text-xs truncate text-blue-200">{pool.liquidity}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}