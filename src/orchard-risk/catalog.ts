import { OrchardCropId, ModelStatus } from "./types";

export const DISEASE_IDS_BY_CROP: Record<OrchardCropId, string[]> = {
  apple: [
    "apple:scab",
    "apple:marssonina",
    "apple:alternaria",
    "apple:anthracnose",
    "apple:blotch",
  ],
  nashi: [
    "nashi:scab",
    "nashi:red_spot",
    "nashi:blotch",
    "nashi:black_spot",
    "nashi:anthracnose",
  ],
};

export const MODEL_STATUS: Record<string, ModelStatus> = {
  "apple:scab": "mills",
  "apple:marssonina": "heuristic",
  "apple:alternaria": "heuristic",
  "apple:anthracnose": "heuristic",
  "apple:blotch": "heuristic",
  "nashi:scab": "duthie",
  "nashi:red_spot": "gymnosporangium",
  "nashi:blotch": "heuristic",
  "nashi:black_spot": "heuristic",
  "nashi:anthracnose": "heuristic",
};

export const DISEASE_DISPLAY_NAME: Record<string, string> = {
  "apple:scab": "黒星病",
  "apple:marssonina": "褐斑病",
  "apple:alternaria": "斑点落葉病",
  "apple:anthracnose": "炭疽病",
  "apple:blotch": "輪紋病",
  "nashi:scab": "黒星病",
  "nashi:red_spot": "赤星病",
  "nashi:blotch": "輪紋病",
  "nashi:black_spot": "黒斑病",
  "nashi:anthracnose": "炭疽病",
};
