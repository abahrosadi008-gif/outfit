/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface WardrobeItem {
  id: string;
  name: string;
  url: string;
}

export interface OutfitLayer {
  garment: WardrobeItem | null; // null represents the base model layer
  generatedImages: Record<string, string>; // Maps composite key (e.g., "pose_emotion_background_color") to image URL
}
