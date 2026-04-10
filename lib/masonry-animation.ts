const ANIMATION_OFFSET_PX = 200;

export type AnimateFromDirection = "bottom" | "top" | "left" | "right" | "center";

export const getAnimationOffset = (): number => ANIMATION_OFFSET_PX;

export const getOpenFromCoords = (
  animateFrom: AnimateFromDirection,
  rect: { width: number; height: number },
  viewport: { width: number; height: number }
): { fromY: number; fromX: number } => {
  switch (animateFrom) {
    case "top":
      return { fromY: -rect.height - ANIMATION_OFFSET_PX, fromX: 0 };
    case "bottom":
      return { fromY: viewport.height + ANIMATION_OFFSET_PX, fromX: 0 };
    case "left":
      return { fromY: 0, fromX: -rect.width - ANIMATION_OFFSET_PX };
    case "right":
      return { fromY: 0, fromX: viewport.width + ANIMATION_OFFSET_PX };
    case "center":
      return { fromY: 0, fromX: 0 };
    default:
      return { fromY: viewport.height + ANIMATION_OFFSET_PX, fromX: 0 };
  }
};

export const getCloseToCoords = (
  animateFrom: AnimateFromDirection,
  viewport: { width: number; height: number }
): { toY: number; toX: number } => {
  switch (animateFrom) {
    case "top":
      return { toY: -viewport.height - ANIMATION_OFFSET_PX, toX: 0 };
    case "bottom":
      return { toY: viewport.height + ANIMATION_OFFSET_PX, toX: 0 };
    case "left":
      return { toY: 0, toX: -viewport.width - ANIMATION_OFFSET_PX };
    case "right":
      return { toY: 0, toX: viewport.width + ANIMATION_OFFSET_PX };
    case "center":
      return { toY: 0, toX: 0 };
    default:
      return { toY: viewport.height + ANIMATION_OFFSET_PX, toX: 0 };
  }
};
