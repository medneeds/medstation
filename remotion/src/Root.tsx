import React from "react";
import { Composition } from "remotion";
import { MedStationVideo } from "./MedStationVideo";
import { TOTAL, FPS } from "./theme";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="main"
    component={MedStationVideo}
    durationInFrames={TOTAL}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
