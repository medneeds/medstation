import React from "react";
import { Composition } from "remotion";
import { MedStationVideo } from "./MedStationVideo";
import { StoryLogo } from "./StoryLogo";
import { TOTAL, FPS } from "./theme";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="main"
      component={MedStationVideo}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1920}
      height={1080}
    />
    <Composition
      id="story-logo"
      component={StoryLogo}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
