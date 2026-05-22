import { DEFAULT_LOCALE } from "./locale";
import type { Device, ProjectState, Slide } from "./types";

let _id = 0;
export const nid = () => `s_${Date.now().toString(36)}_${(_id++).toString(36)}`;

const en = (s: string) => ({ [DEFAULT_LOCALE]: s });

const SHOT_IPHONE = "/screenshots/apple/iphone/{locale}";
const SHOT_ANDROID = "/screenshots/android/phone/{locale}";

function daltonSlides(prefix: string): Slide[] {
  return [
    {
      id: nid(),
      layout: "hero",
      label: en("DALTON ACCESS"),
      headline: en("Your sport\ncommunity"),
      screenshot: `${prefix}/01.png`,
    },
    {
      id: nid(),
      layout: "device-bottom",
      label: en("COMMUNITY"),
      headline: en("Talk with athletes\nlike you"),
      screenshot: `${prefix}/02.png`,
    },
    {
      id: nid(),
      layout: "device-top",
      label: en("COACHING"),
      headline: en("Verified coach\ninsights"),
      screenshot: `${prefix}/03.png`,
      inverted: true,
    },
    {
      id: nid(),
      layout: "device-bottom",
      label: en("EVENTS"),
      headline: en("Book Dalton\nevents"),
      screenshot: `${prefix}/04.png`,
    },
    {
      id: nid(),
      layout: "two-devices",
      label: en("SPONSORS"),
      headline: en("Partner with\nDalton & beyond"),
      screenshot: `${prefix}/05.png`,
      screenshotSecondary: `${prefix}/06.png`,
    },
    {
      id: nid(),
      layout: "device-top",
      label: en("MEDIA"),
      headline: en("Pitch training\n& podcasts"),
      screenshot: `${prefix}/06.png`,
    },
    {
      id: nid(),
      layout: "no-device",
      label: en("AND MORE"),
      headline: en("Messaging\nCoaches\nEvents\nSponsors\nMedia"),
      screenshot: "",
    },
  ];
}

function ipadStarter(): Slide[] {
  return [
    {
      id: nid(),
      layout: "hero",
      label: en("DALTON ACCESS"),
      headline: en("Built for\nathletes."),
      screenshot: `${SHOT_IPHONE}/01.png`,
    },
    {
      id: nid(),
      layout: "device-bottom",
      label: en("COMMUNITY"),
      headline: en("Connect on\nthe big screen."),
      screenshot: `${SHOT_IPHONE}/02.png`,
    },
    {
      id: nid(),
      layout: "device-top",
      label: en("COACHING"),
      headline: en("Grow with\nverified coaches."),
      screenshot: `${SHOT_IPHONE}/03.png`,
      inverted: true,
    },
  ];
}

function tabletStarter(kind: "7" | "10"): Slide[] {
  return [
    {
      id: nid(),
      layout: "hero",
      label: en("DALTON ACCESS"),
      headline: en(kind === "7" ? "Sport community\nin your pocket." : "Dalton Access\nfor tablets."),
      screenshot: `${SHOT_ANDROID}/01.png`,
    },
    {
      id: nid(),
      layout: "split-landscape",
      label: en("EVENTS"),
      headline: en("Meet talent\nin your sport."),
      screenshot: `${SHOT_ANDROID}/04.png`,
    },
  ];
}

function fgStarter(): Slide[] {
  return [
    {
      id: nid(),
      layout: "feature-graphic",
      label: {},
      headline: en("Sport community · Coach insights · Events · Sponsors · Media"),
      screenshot: "",
    },
  ];
}

export const DEFAULT_PROJECT: ProjectState = {
  appName: "Dalton Access",
  themeId: "dalton-dark",
  locales: [DEFAULT_LOCALE],
  locale: DEFAULT_LOCALE,
  device: "iphone",
  orientation: "portrait",
  appIcon: "/app-icon.png",
  slidesByDevice: {
    iphone: daltonSlides(SHOT_IPHONE),
    android: daltonSlides(SHOT_ANDROID),
    ipad: ipadStarter(),
    "android-7": tabletStarter("7"),
    "android-10": tabletStarter("10"),
    "feature-graphic": fgStarter(),
  },
};

export function newSlide(layout: Slide["layout"] = "device-bottom"): Slide {
  return {
    id: nid(),
    layout,
    label: en("NEW"),
    headline: en("Edit this\nheadline."),
    screenshot: "",
  };
}

export function detectPlatform(device: Device): "ios" | "android" {
  return device === "iphone" || device === "ipad" ? "ios" : "android";
}
