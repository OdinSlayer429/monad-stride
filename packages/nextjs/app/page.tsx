"use client";

import React, { useEffect, useState } from "react";
import type { NextPage } from "next";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { BottomNav, NavTab } from "~~/components/stride/BottomNav";
import { HeaderNav } from "~~/components/stride/HeaderNav";
import { HomeTab } from "~~/components/stride/HomeTab";
import { OnboardingModal } from "~~/components/stride/OnboardingModal";
import { PermissionsSheet } from "~~/components/stride/PermissionsSheet";
import { PoolDetailModal } from "~~/components/stride/PoolDetailModal";
import { PoolsTab } from "~~/components/stride/PoolsTab";
import { PostRunModal } from "~~/components/stride/PostRunModal";
import { ProfileTab } from "~~/components/stride/ProfileTab";
import { ResultsModal } from "~~/components/stride/ResultsModal";
import { StrideButton } from "~~/components/stride/StrideButton";
import { TrackTab } from "~~/components/stride/TrackTab";
import { LandingPage } from "~~/components/stride/landing/LandingPage";
import { useStridePools } from "~~/hooks/stride/useStridePools";
import { StrideStorage } from "~~/services/stride/storage";
import { Pool, TrophyBadge, UserProfile, UserRun } from "~~/types/stride";

const Home: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<NavTab>("home");
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true); // Default to demo mode for zero-friction access
  const [hasEnteredApp, setHasEnteredApp] = useState<boolean>(false);

  // Modals & Sheets
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showPermissions, setShowPermissions] = useState<boolean>(false);
  const [selectedPoolForDetail, setSelectedPoolForDetail] = useState<Pool | null>(null);
  const [selectedPoolForResults, setSelectedPoolForResults] = useState<Pool | null>(null);
  const [finishedRunForModal, setFinishedRunForModal] = useState<UserRun | null>(null);
  const [trackPreselectedPoolId, setTrackPreselectedPoolId] = useState<string | undefined>(undefined);

  // App Data State
  const [profile, setProfile] = useState<UserProfile>(() => StrideStorage.getProfile());
  const { pools, isLoading: poolsLoading, refetch: refetchPools } = useStridePools();
  const [runs, setRuns] = useState<UserRun[]>(() => StrideStorage.getRuns());
  const [badges, setBadges] = useState<TrophyBadge[]>(() => StrideStorage.getBadges());

  // Mount & Initialization
  useEffect(() => {
    // Load from local storage
    setProfile(StrideStorage.getProfile());
    setRuns(StrideStorage.getRuns());
    setBadges(StrideStorage.getBadges());

    // Check onboarding
    if (!StrideStorage.hasOnboarded()) {
      setShowOnboarding(true);
    }
  }, []);

  // Sync connected wallet address if user connects
  useEffect(() => {
    if (isConnected && connectedAddress) {
      const updated = StrideStorage.updateProfile({ address: connectedAddress });
      setProfile(updated);
      setHasEnteredApp(true);
    }
  }, [isConnected, connectedAddress]);

  // Handle Onboarding Completion
  const handleCompleteOnboarding = () => {
    StrideStorage.setOnboarded();
    setShowOnboarding(false);
    if (!StrideStorage.hasGrantedPermissions()) {
      setShowPermissions(true);
    }
  };

  // Handle Permissions Completion
  const handleConfirmPermissions = () => {
    StrideStorage.setPermissionsGranted();
    setShowPermissions(false);
    toast.success("Stride sensors & gasless keys enabled!", { icon: "⚡" });
  };

  // Run Flow Handlers
  const handleFinishRun = (newRun: UserRun) => {
    setFinishedRunForModal(newRun);
  };

  // Called by PostRunModal AFTER a real `submitActivity` transaction has already
  // confirmed onchain — this just mirrors that into local run history for display.
  const handleRunSubmitted = (run: UserRun, poolId: string) => {
    const updatedRun = { ...run, poolId, submittedToPool: true };
    StrideStorage.addRun(updatedRun);
    setRuns(StrideStorage.getRuns());
    setProfile(StrideStorage.getProfile());
    setFinishedRunForModal(null);
    setCurrentTab("pools");
  };

  const handleSaveRunSolo = (run: UserRun) => {
    StrideStorage.addRun(run);
    setRuns(StrideStorage.getRuns());
    setProfile(StrideStorage.getProfile());
    setFinishedRunForModal(null);
    toast.success("Run saved to activity history! Keep the streak alive.", { icon: "👟" });
    setCurrentTab("home");
  };

  // Anti-Cheat "Spot the fake" Dispute Handler
  // NOTE: still driven by mock `suspiciousPattern` data, which real pools
  // (read live from the contract) never populate — real dispute() wiring,
  // which needs a runner's actual signed checkpoint chain, is a separate,
  // not-yet-queued step. Left in place so this doesn't error for old local
  // run history; it's effectively dormant against real pools.
  const handleDispute = (poolId: string, suspectAddress: string) => {
    const res = StrideStorage.disputeParticipant(poolId, suspectAddress, profile.address);
    if (res.success) {
      refetchPools();
      setProfile(StrideStorage.getProfile());
      setBadges(StrideStorage.getBadges());
      toast.success(`Dispute verified onchain! Cheater slashed. Bounty ${res.bounty} added to claimable balance!`, {
        icon: "🕵️",
        duration: 4000,
      });
    }
  };

  // Claim Winnings Handler
  const handleClaimWinnings = () => {
    const claimed = StrideStorage.claimAllWinnings();
    setProfile(StrideStorage.getProfile());
    toast.success(`Claimed ${claimed} to wallet! Monad pull-payment completed.`, { icon: "💸" });
    if (selectedPoolForResults) {
      setSelectedPoolForResults(null);
    }
  };

  // --------------------------------------------------------------------------
  // LANDING PAGE (shown when not connected and hasn't clicked "launch app")
  // --------------------------------------------------------------------------
  if (!isConnected && !hasEnteredApp) {
    return (
      <>
        <LandingPage
          onLaunchApp={() => {
            setHasEnteredApp(true);
            if (!StrideStorage.hasGrantedPermissions()) {
              setShowPermissions(true);
            }
          }}
        />
        <OnboardingModal isOpen={showOnboarding} onComplete={handleCompleteOnboarding} />
      </>
    );
  }

  // --------------------------------------------------------------------------
  // PRIMARY MOBILE-FIRST APP EXPERIENCE
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#150E2C] flex flex-col items-center justify-start">
      {/* Centered Mobile App Canvas */}
      <div className="w-full max-w-md min-h-screen bg-[#0B061A] sm:border-x sm:border-[#362A5E] flex flex-col shadow-2xl relative">
        {/* Top Header */}
        <HeaderNav
          isDemoMode={isDemoMode}
          onToggleDemoMode={() => {
            const next = !isDemoMode;
            setIsDemoMode(next);
            toast(next ? "Switched to Quick Demo Mode ⚡" : "Switched to Live Web3 Wallet 🔗", {
              icon: next ? "⚡" : "🔗",
            });
          }}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 w-full pt-2">
          {currentTab === "home" && (
            <HomeTab
              profile={profile}
              pools={pools}
              recentRuns={runs}
              onStartRunClick={() => setCurrentTab("track")}
              onSelectPool={pool => setSelectedPoolForDetail(pool)}
              onViewAllPools={() => setCurrentTab("pools")}
            />
          )}

          {currentTab === "track" && (
            <TrackTab
              pools={pools}
              preselectedPoolId={trackPreselectedPoolId}
              runnerAddress={profile.address}
              onFinishRun={handleFinishRun}
            />
          )}

          {currentTab === "pools" && (
            <PoolsTab
              pools={pools}
              isLoading={poolsLoading}
              onSelectPool={pool => setSelectedPoolForDetail(pool)}
              onPoolsChanged={refetchPools}
            />
          )}

          {currentTab === "profile" && (
            <ProfileTab profile={profile} badges={badges} runs={runs} onClaimAll={handleClaimWinnings} />
          )}
        </main>

        {/* Floating Bottom Navigation Thumb Dock */}
        <BottomNav
          currentTab={currentTab}
          onSelectTab={tab => {
            setCurrentTab(tab);
            setTrackPreselectedPoolId(undefined); // reset pool track filter
          }}
        />
      </div>

      {/* OVERLAY MODALS */}

      {/* 1. First-time swipe onboarding */}
      <OnboardingModal isOpen={showOnboarding} onComplete={handleCompleteOnboarding} />

      {/* 2. One-time Setup ("Enable Stride") */}
      <PermissionsSheet isOpen={showPermissions} onConfirm={handleConfirmPermissions} />

      {/* 3. Post-Run Summary & Share Card */}
      <PostRunModal
        run={finishedRunForModal}
        pools={pools}
        isOpen={!!finishedRunForModal}
        onClose={() => setFinishedRunForModal(null)}
        onSubmitted={handleRunSubmitted}
        onSaveSolo={handleSaveRunSolo}
        onPoolsChanged={refetchPools}
      />

      {/* 4. Pool Detail & "Spot the fake" Dispute Inspector */}
      <PoolDetailModal
        pool={selectedPoolForDetail}
        isOpen={!!selectedPoolForDetail}
        onClose={() => setSelectedPoolForDetail(null)}
        onDispute={handleDispute}
        onViewResults={pool => {
          setSelectedPoolForDetail(null);
          setSelectedPoolForResults(pool);
        }}
        onTrackForThisPool={pool => {
          setSelectedPoolForDetail(null);
          setTrackPreselectedPoolId(pool.id);
          setCurrentTab("track");
        }}
      />

      {/* 5. Results & Claim Winnings */}
      <ResultsModal
        pool={selectedPoolForResults}
        claimableAmount={profile.claimableMON}
        isOpen={!!selectedPoolForResults}
        onClose={() => setSelectedPoolForResults(null)}
        onClaim={handleClaimWinnings}
      />
    </div>
  );
};

export default Home;
