export type MissionSeed = {
  color_name: string;
  color_hex: string;
  prompt: string;
};

export const missionSeeds: MissionSeed[] = [
  {
    color_name: "Orange",
    color_hex: "#F2994A",
    prompt: "Hunt for orange details most people walk past.",
  },
  {
    color_name: "Yellow",
    color_hex: "#F2C94C",
    prompt: "Chase bright yellow moments that make the place feel alive.",
  },
  {
    color_name: "Red",
    color_hex: "#EB5757",
    prompt: "Look for bold red hits hiding in signs, food, fabric, and passing moments.",
  },
  {
    color_name: "Blue",
    color_hex: "#2F80ED",
    prompt: "Collect blue details that make the place feel calm, cool, or cinematic.",
  },
  {
    color_name: "Green",
    color_hex: "#219653",
    prompt: "Find green in the quiet corners, plants, shutters, signs, and small surprises.",
  },
  {
    color_name: "Pink",
    color_hex: "#E97FB1",
    prompt: "Hunt for soft pink details that make the place feel playful or dreamy.",
  },
  {
    color_name: "White",
    color_hex: "#F7F5EF",
    prompt: "Notice bright white details, clean lines, light, and negative space.",
  },
  {
    color_name: "Black",
    color_hex: "#2B2523",
    prompt: "Capture deep black details, shadows, outlines, and graphic contrasts.",
  },
  {
    color_name: "Purple",
    color_hex: "#9B51E0",
    prompt: "Search for unexpected purple moments hiding in lights, flowers, packaging, and dusk.",
  },
];

export function getMissionByColorName(colorName: string) {
  return missionSeeds.find((mission) => mission.color_name === colorName) ?? missionSeeds[0];
}

export function getRandomMission() {
  return missionSeeds[Math.floor(Math.random() * missionSeeds.length)];
}
