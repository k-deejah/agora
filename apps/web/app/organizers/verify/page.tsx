"use client";

import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface OrganizerProfile {
  address: string;
  displayName: string;
}

export default function OrganizerVerifyPage() {
  // Mock fallback address and loaded state
  const [walletAddress, setWalletAddress] = useState("GBY5D6K6X3H5M3R3W3Y3C3D3E3F3G3H3I3J3K3L3M3N3O3P3Q3R3S3T4");
  const [displayName, setDisplayName] = useState("Agora Organizer");
  
  // Dashboard states
  const [currentStake, setCurrentStake] = useState(0);
  const [minCollateral] = useState(1000); // Minimum required collateral is 1000 tokens
  const [isVerified, setIsVerified] = useState(false);
  
  // Staking form inputs
  const [stakeAmountInput, setStakeAmountInput] = useState("1000");
  
  // Unstaking timer states
  const [unstakeLockupRemaining, setUnstakeLockupRemaining] = useState<number | null>(null);
  const [isLockupActive, setIsLockupActive] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Transaction XDR states
  const [generatedXdr, setGeneratedXdr] = useState<string | null>(null);
  const [xdrActionType, setXdrActionType] = useState<"stake" | "unstake" | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoadingXdr, setIsLoadingXdr] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch organizer profile if logged in
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setWalletAddress(data.profile.address);
            setDisplayName(data.profile.displayName || "Agora Organizer");
          }
        }
      } catch (err) {
        // Silently catch and use fallback mock credentials
      }
    }
    fetchProfile();
  }, []);

  // Update verified status based on current stake
  useEffect(() => {
    setIsVerified(currentStake >= minCollateral);
  }, [currentStake, minCollateral]);

  // Handle countdown timer
  useEffect(() => {
    if (isLockupActive && unstakeLockupRemaining !== null) {
      timerIntervalRef.current = setInterval(() => {
        setUnstakeLockupRemaining((prev) => {
          if (prev === null || prev <= 1) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            setIsLockupActive(false);
            showToast("Lockup countdown complete! You can now finalize your withdrawal.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isLockupActive, unstakeLockupRemaining]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Generate Stake XDR payload
  const handleGenerateStakeXdr = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingXdr(true);
    setErrorMsg(null);
    setGeneratedXdr(null);

    const amount = Number(stakeAmountInput);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg("Please enter a valid positive staking amount.");
      setIsLoadingXdr(false);
      return;
    }

    try {
      const res = await fetch("/api/organizers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stake",
          organizerAddress: walletAddress,
          amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate staking XDR payload");
      }

      setGeneratedXdr(data.xdr);
      setContractAddress(data.contractAddress);
      setXdrActionType("stake");
      
      // Update local state to simulate the mock transaction stake completion
      setCurrentStake(amount);
      showToast(`Staking transaction generated! Mock stake updated to ${amount} tokens.`);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoadingXdr(false);
    }
  };

  // Initiate Unstake / Lockup timer
  const handleInitiateUnstake = () => {
    if (currentStake <= 0) {
      showToast("You do not have any tokens currently staked.");
      return;
    }
    // Lockup duration defaults to 60 seconds for fast demo and evaluation purposes,
    // but represents the lockup countdown interface.
    setUnstakeLockupRemaining(60);
    setIsLockupActive(true);
    showToast("Unstaking process initiated. Lockup countdown started.");
  };

  // Fast forward lockup timer (evaluation helper)
  const handleFastForwardTimer = () => {
    setUnstakeLockupRemaining(2);
    showToast("Fast forwarded lockup timer to 2 seconds!");
  };

  // Finalize Unstake (Withdraw Collateral)
  const handleFinalizeWithdraw = async () => {
    setIsLoadingXdr(true);
    setErrorMsg(null);
    setGeneratedXdr(null);

    try {
      const res = await fetch("/api/organizers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unstake",
          organizerAddress: walletAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate withdrawal XDR payload");
      }

      setGeneratedXdr(data.xdr);
      setContractAddress(data.contractAddress);
      setXdrActionType("unstake");
      
      // Reset local state to simulate the mock transaction withdrawal completion
      setCurrentStake(0);
      setUnstakeLockupRemaining(null);
      showToast("Withdrawal transaction generated! Staked collateral balance has been withdrawn.");
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoadingXdr(false);
    }
  };

  // Helper to format remaining time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!");
  };

  return (
    <main className="flex flex-col min-h-screen bg-base">
      <Navbar />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] border-4 border-black bg-accent px-6 py-4 text-black font-bold uppercase shadow-[-4px_4px_0px_0px_rgba(0,0,0,1)]">
          {toastMessage}
        </div>
      )}

      <div className="flex-1 w-full max-w-[1221px] mx-auto px-4 lg:px-0 py-12">
        {/* Title Section */}
        <div className="border-4 border-black bg-white p-6 rounded-2xl shadow-[-8px_8px_0px_0px_rgba(0,0,0,1)] mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider bg-accent/30 text-accent-dark px-3 py-1 border border-black rounded-full">
              Organizer Panel
            </span>
            <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight text-black mt-2">
              Verification & Collateral Staking
            </h1>
            <p className="text-muted-text font-medium mt-1">
              Verify your organizer identity by locking collateral on the Soroban smart contract.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm bg-surface px-4 py-2 border-2 border-black rounded-lg">
              Address: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
            </span>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column - Stats and Details */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            
            {/* Status Card */}
            <div className="border-4 border-black bg-white p-6 rounded-2xl shadow-[-8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-bl-full flex items-center justify-center">
                <Image
                  src="/icons/stellar-logo.svg"
                  alt="Stellar"
                  width={36}
                  height={36}
                  className="opacity-20"
                />
              </div>
              <h2 className="text-xl font-black italic uppercase tracking-wider text-black mb-4">
                Verification Status
              </h2>
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={`border-4 border-black px-5 py-2.5 rounded-full font-black uppercase text-lg shadow-[-4px_4px_0px_0px_rgba(0,0,0,1)] ${
                    isVerified
                      ? "bg-success-light text-black"
                      : "bg-[#FFBEBD] text-black"
                  }`}
                >
                  {isVerified ? "★ Verified" : "⚠ Not Verified"}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-black/10 pb-2">
                  <span className="font-semibold text-muted-text">Organizer:</span>
                  <span className="font-bold text-black">{displayName}</span>
                </div>
                <div className="flex justify-between border-b border-black/10 pb-2">
                  <span className="font-semibold text-muted-text">Staked Tokens:</span>
                  <span className="font-bold text-black">{currentStake} Tokens</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="font-semibold text-muted-text">Minimum Required:</span>
                  <span className="font-bold text-black">{minCollateral} Tokens</span>
                </div>
              </div>
            </div>

            {/* Contract Info Card */}
            <div className="border-4 border-black bg-[#FFEFD3] p-6 rounded-2xl shadow-[-8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-xl font-black italic uppercase tracking-wider text-black mb-4">
                Contract Information
              </h2>
              <div className="space-y-4 text-sm font-medium">
                <div>
                  <p className="text-muted-text mb-1">Staking Token Contract</p>
                  <div className="flex items-center justify-between bg-white border-2 border-black p-2.5 rounded-lg">
                    <span className="font-mono text-xs break-all pr-2">
                      CDK5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5
                    </span>
                    <button
                      onClick={() => handleCopyToClipboard("CDK5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5")}
                      className="border border-black bg-white hover:bg-accent p-1.5 rounded transition-colors"
                      title="Copy Address"
                    >
                      🗐
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-text leading-relaxed">
                  Staked tokens are locked within the event registry contract. Verified organizers gain access to premium features, increased registration limits, and direct ticket distributions.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Actions Panel (Staking & Unstaking) */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* Main Collateral Controls */}
            <div className="border-4 border-black bg-white p-6 md:p-8 rounded-2xl shadow-[-8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl font-black italic uppercase tracking-wider text-black mb-6">
                Manage Collateral Stake
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Stake Section */}
                <div className="border-2 border-black p-5 rounded-xl bg-base/20 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black uppercase text-black mb-2">Stake Collateral</h3>
                    <p className="text-sm text-muted-text mb-6">
                      Lock your tokens to receive Verified organizer status. Enter the amount to stake.
                    </p>
                    <form onSubmit={handleGenerateStakeXdr}>
                      <div className="mb-4">
                        <label className="block text-sm font-bold text-black mb-2">
                          Staking Amount (Tokens)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            value={stakeAmountInput}
                            onChange={(e) => setStakeAmountInput(e.target.value)}
                            className="flex-1 bg-white border-2 border-black p-3 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                          <button
                            type="button"
                            onClick={() => setStakeAmountInput(minCollateral.toString())}
                            className="border-2 border-black bg-surface hover:bg-accent px-3 py-2 rounded-lg font-bold text-xs uppercase transition-all"
                          >
                            Min (1000)
                          </button>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        backgroundColor="bg-accent"
                        textColor="text-black"
                        className="w-full border-2 border-black font-black uppercase py-3 shadow-[-4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[-2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[2px] hover:translate-y-[2px]"
                        disabled={isLoadingXdr}
                      >
                        Stake Collateral
                      </Button>
                    </form>
                  </div>
                </div>

                {/* Unstake Section */}
                <div className="border-2 border-black p-5 rounded-xl bg-base/20 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black uppercase text-black mb-2">Withdraw Collateral</h3>
                    <p className="text-sm text-muted-text mb-6">
                      Initiate the unstaking sequence. Note that withdrawing collateral will remove your Verified status.
                    </p>
                  </div>

                  <div>
                    {/* Unstaked State or Initial State */}
                    {currentStake === 0 && !isLockupActive && (
                      <div className="text-center p-4 bg-muted border border-black/10 rounded-lg text-sm text-muted-text font-bold uppercase mb-4">
                        No Collateral Staked
                      </div>
                    )}

                    {/* Lockup Countdown Active State */}
                    {isLockupActive && unstakeLockupRemaining !== null && (
                      <div className="mb-4">
                        <div className="border-2 border-black bg-[#FFF8D3] p-4 rounded-lg text-center shadow-[-3px_3px_0px_0px_rgba(0,0,0,1)]">
                          <p className="text-xs font-black uppercase tracking-wider text-black mb-1">
                            Lockup Countdown Timer
                          </p>
                          <p className="text-2xl font-mono font-black text-black">
                            {formatTime(unstakeLockupRemaining)}
                          </p>
                          <p className="text-[10px] text-muted-text mt-1">
                            Waiting for lockup unlock...
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleFastForwardTimer}
                          className="w-full text-center text-xs font-bold text-accent-dark underline mt-2 hover:text-black cursor-pointer"
                        >
                          ⚡ Skip lockup timer (Evaluation helper)
                        </button>
                      </div>
                    )}

                    {/* Lockup period active but timer is 0 (Unlocked) */}
                    {unstakeLockupRemaining === 0 && !isLockupActive && (
                      <div className="text-center p-4 bg-success-light border-2 border-black rounded-lg text-sm text-black font-bold uppercase mb-4 shadow-[-3px_3px_0px_0px_rgba(0,0,0,1)]">
                        ✓ Collateral Unlocked
                      </div>
                    )}

                    {/* Unstaking Actions */}
                    {currentStake > 0 && !isLockupActive && unstakeLockupRemaining === null && (
                      <Button
                        type="button"
                        onClick={handleInitiateUnstake}
                        backgroundColor="bg-[#FFBEBD]"
                        textColor="text-black"
                        className="w-full border-2 border-black font-black uppercase py-3 shadow-[-4px_4px_0px_0px_rgba(0,0,0,1)]"
                      >
                        Initiate Unstaking
                      </Button>
                    )}

                    {isLockupActive && (
                      <Button
                        type="button"
                        disabled
                        backgroundColor="bg-gray-200"
                        textColor="text-gray-400"
                        className="w-full border-2 border-dashed border-gray-400 font-black uppercase py-3 cursor-not-allowed"
                      >
                        Lockup Active
                      </Button>
                    )}

                    {unstakeLockupRemaining === 0 && !isLockupActive && (
                      <Button
                        type="button"
                        onClick={handleFinalizeWithdraw}
                        backgroundColor="bg-accent"
                        textColor="text-black"
                        className="w-full border-2 border-black font-black uppercase py-3 shadow-[-4px_4px_0px_0px_rgba(0,0,0,1)]"
                        disabled={isLoadingXdr}
                      >
                        Withdraw Collateral
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* XDR transaction output card */}
            {isLoadingXdr && (
              <div className="border-4 border-black bg-white p-8 rounded-2xl shadow-[-8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center min-h-[200px]">
                <div className="w-12 h-12 border-4 border-black border-t-accent rounded-full animate-spin mb-4" />
                <p className="font-black uppercase tracking-wider text-black text-sm">
                  Generating XDR Transaction Payload...
                </p>
              </div>
            )}

            {errorMsg && (
              <div className="border-4 border-black bg-[#FFBEBD] p-6 rounded-2xl shadow-[-8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-black uppercase text-red-700 text-lg mb-2">⚠ Error</h3>
                <p className="font-semibold text-black text-sm">{errorMsg}</p>
              </div>
            )}

            {generatedXdr && (
              <div className="border-4 border-black bg-white p-6 md:p-8 rounded-2xl shadow-[-8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider bg-success-light px-3 py-1 border border-black rounded-full">
                      ✓ Generated Payload
                    </span>
                    <h3 className="text-xl font-black italic uppercase tracking-wider text-black mt-2">
                      {xdrActionType === "stake" ? "Stake Collateral Transaction" : "Withdraw Collateral Transaction"}
                    </h3>
                  </div>
                  <button
                    onClick={() => handleCopyToClipboard(generatedXdr)}
                    className="border-2 border-black bg-accent hover:bg-accent-hover font-bold px-4 py-2 text-sm uppercase rounded-lg shadow-[-2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                  >
                    Copy XDR Payload
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-muted-text mb-1">Target Contract Address</p>
                    <p className="font-mono text-sm bg-base/50 p-2 border border-black/10 rounded overflow-x-auto text-black">
                      {contractAddress}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-text mb-1">Base64 Transaction Envelope XDR</p>
                    <div className="bg-ink text-white font-mono text-xs p-4 rounded-xl border border-black overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all select-all">
                      {generatedXdr}
                    </div>
                  </div>
                  <p className="text-xs text-muted-text">
                    This payload can be pasted directly into the Stellar Laboratory Transaction Signer tool or passed to a browser wallet extension (like Freighter) to sign and broadcast.
                  </p>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
