import React from "react";
import { BookFlip } from "./BookFlip";
import { BucketList } from "./BucketList";
import { FinalCTA } from "./FinalCTA";
import { FloatingDock } from "./FloatingDock";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { LandingFooter } from "./LandingFooter";
import { MarqueeBand } from "./MarqueeBand";
import { Pillars } from "./Pillars";
import { VibePicker } from "./VibePicker";
import { WaveDivider } from "./WaveDivider";

interface LandingPageProps {
  onLaunchApp: () => void;
}

/** The one-page-scroll marketing site — everything before someone clicks into the app. */
export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp }) => {
  return (
    <div className="min-h-screen bg-[#150E2C] scroll-smooth pb-24">
      <Hero onLaunchApp={onLaunchApp} />
      <MarqueeBand />
      {/* fill always matches the section being entered, not the one being left */}
      <WaveDivider fill="#E3DCF7" />
      <div className="bg-[#E3DCF7]">
        <HowItWorks />
      </div>
      <WaveDivider fill="#150E2C" flip />
      <Pillars />
      <BookFlip />
      <BucketList />
      <VibePicker onLaunchApp={onLaunchApp} />
      <FinalCTA onLaunchApp={onLaunchApp} />
      <LandingFooter />
      <FloatingDock onLaunchApp={onLaunchApp} />
    </div>
  );
};
