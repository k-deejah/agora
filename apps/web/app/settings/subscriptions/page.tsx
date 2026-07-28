"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import Image from "next/image";

type SettingsTab = "profile" | "notifications" | "payment" | "subscriptions";

const tabs: { id: SettingsTab; label: string; href: string }[] = [
  { id: "profile", label: "Profile", href: "/settings" },
  { id: "notifications", label: "Notifications", href: "/settings" },
  { id: "payment", label: "Payment", href: "/settings" },
  { id: "subscriptions", label: "Subscriptions", href: "/settings/subscriptions" },
];

interface SubscriptionInfo {
  tier: string;
  isActive: boolean;
  expiresAt: string | null;
  price: string;
}

interface SeriesPass {
  id: string;
  eventName: string;
  validFrom: string;
  validTo: string;
  remainingUses: number;
  totalUses: number;
}

export default function SubscriptionsSettingsPage() {
  const router = useRouter();
  
  // States
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    tier: "basic",
    isActive: false,
    expiresAt: null,
    price: "0",
  });
  const [seriesPasses, setSeriesPasses] = useState<SeriesPass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch subscription data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/subscriptions");
        if (!res.ok) {
          throw new Error("Failed to load subscription settings");
        }
        const data = await res.json();
        if (data.subscription) {
          setSubscription(data.subscription);
        }
        if (data.seriesPasses) {
          setSeriesPasses(data.seriesPasses);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "An error occurred loading subscriptions");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Subscribe handler
  const handleSubscribe = async () => {
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subscribe" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Subscription creation failed");
      }
      setSubscription(data.subscription);
      showToast("Successfully subscribed to Agora Pro Organizer!");
    } catch (err: any) {
      setErrorMsg(err.message || "Subscription update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  // Cancel handler
  const handleCancel = async () => {
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Subscription cancellation failed");
      }
      setSubscription(data.subscription);
      showToast("Subscription cancelled successfully.");
    } catch (err: any) {
      setErrorMsg(err.message || "Subscription update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper to format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <main className="flex flex-col min-h-screen bg-base">
      <Navbar />

      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] border-4 border-black bg-accent px-6 py-4 text-black font-bold uppercase shadow-[-4px_4px_0px_0px_rgba(0,0,0,1)]">
          {toastMessage}
        </div>
      )}

      <div className="w-full max-w-3xl mx-auto px-4 py-10 flex-1">
        
        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-black italic uppercase tracking-wider text-black">Settings</h1>
          <p className="text-muted-text mt-1 font-semibold">
            Manage your account preferences
          </p>
        </div>

        {/* Tabs Bar */}
        <div className="bg-white rounded-2xl border-4 border-black shadow-[_-6px_6px_0_rgba(0,0,0,1)] overflow-hidden mb-8">
          <div className="flex border-b-4 border-black">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => router.push(tab.href)}
                className={`flex-1 px-4 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                  tab.id === "subscriptions"
                    ? "bg-accent text-black border-b-4 border-black"
                    : "text-muted-text hover:text-black"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8 bg-base/5">
            {errorMsg && (
              <div className="mb-6 rounded-xl border-4 border-black bg-[#FFBEBD] px-4 py-3 text-sm font-bold text-black shadow-[-2px_2px_0px_0px_rgba(0,0,0,1)]">
                ⚠ {errorMsg}
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 border-4 border-black border-t-accent rounded-full animate-spin mb-4" />
                <p className="font-bold uppercase tracking-wider text-sm text-black">Loading Subscriptions...</p>
              </div>
            ) : (
              <div className="space-y-8">
                
                {/* Pro Organizer Card */}
                <div className="border-4 border-black bg-white rounded-2xl p-6 shadow-[-6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                  
                  {/* Accent design stamp */}
                  {subscription.isActive && (
                    <div className="absolute top-0 right-0 bg-success-light text-black border-l-4 border-b-4 border-black font-black uppercase text-xs px-4 py-1.5 shadow-[-2px_2px_0_rgba(0,0,0,0.15)]">
                      ★ Active
                    </div>
                  )}

                  <h2 className="text-2xl font-black italic uppercase tracking-tight text-black mb-1">
                    Agora Pro Organiser
                  </h2>
                  <p className="text-sm font-bold text-muted-text mb-6">
                    Unlock exclusive developer limits and platform features
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center border-t-4 border-b-4 border-black py-6 my-6">
                    <div className="md:col-span-2 space-y-3">
                      <div className="flex items-center gap-2.5 font-bold text-sm text-black">
                        <span className="text-accent-dark">✓</span> Unlimited public event registrations
                      </div>
                      <div className="flex items-center gap-2.5 font-bold text-sm text-black">
                        <span className="text-accent-dark">✓</span> Pro badge stamp next to your organizer brand
                      </div>
                      <div className="flex items-center gap-2.5 font-bold text-sm text-black">
                        <span className="text-accent-dark">✓</span> Zero platform fee tier (0% ticket fee)
                      </div>
                      <div className="flex items-center gap-2.5 font-bold text-sm text-black">
                        <span className="text-accent-dark">✓</span> Premium discover list search priority
                      </div>
                    </div>

                    <div className="bg-[#FFEFD3] border-4 border-black rounded-xl p-4 text-center shadow-[-4px_4px_0_rgba(0,0,0,1)]">
                      <p className="text-xs font-black uppercase tracking-wider text-muted-text mb-1">Price</p>
                      <p className="text-2xl font-black text-black">29.99 USDC</p>
                      <p className="text-[10px] font-bold text-muted-text">per month</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-muted-text uppercase">
                        Current Status
                      </p>
                      <p className="text-sm font-extrabold text-black">
                        {subscription.isActive
                          ? `Pro Subscription active (renews/expires on ${formatDate(subscription.expiresAt)})`
                          : "Basic subscription (free)"}
                      </p>
                    </div>

                    {subscription.isActive ? (
                      <Button
                        type="button"
                        onClick={handleCancel}
                        backgroundColor="bg-[#FFBEBD]"
                        textColor="text-black"
                        className="w-full sm:w-auto border-2 border-black font-black uppercase px-6 py-2.5 shadow-[-3px_3px_0_rgba(0,0,0,1)]"
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Cancelling..." : "Cancel Subscription"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleSubscribe}
                        backgroundColor="bg-accent"
                        textColor="text-black"
                        className="w-full sm:w-auto border-2 border-black font-black uppercase px-6 py-2.5 shadow-[-3px_3px_0_rgba(0,0,0,1)]"
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Subscribing..." : "Subscribe to Pro"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Series Passes Section */}
                <div className="border-4 border-black bg-white rounded-2xl p-6 shadow-[-6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <h2 className="text-xl font-black italic uppercase tracking-wider text-black mb-1">
                    My Series Passes
                  </h2>
                  <p className="text-xs font-bold text-muted-text mb-6">
                    Manage active multi-event season passes held by your account
                  </p>

                  {seriesPasses.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-black/20 rounded-xl font-bold text-muted-text text-sm uppercase">
                      No active series passes
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {seriesPasses.map((pass) => (
                        <div
                          key={pass.id}
                          className="border-2 border-black rounded-xl p-4 bg-[#FFEFD3]/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[-3px_3px_0_rgba(0,0,0,1)]"
                        >
                          <div>
                            <h3 className="font-extrabold text-black text-base">{pass.eventName}</h3>
                            <p className="text-xs font-bold text-muted-text mt-1">
                              Validity: {formatDate(pass.validFrom)} - {formatDate(pass.validTo)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-text">
                              Remaining Uses:
                            </span>
                            <span className="border-2 border-black bg-white px-3 py-1 rounded-full font-black text-xs shadow-[-1px_1px_0_rgba(0,0,0,1)] text-black">
                              {pass.remainingUses} / {pass.totalUses}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
