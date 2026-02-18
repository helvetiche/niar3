"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface MasonryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Content; receives close() to trigger Masonry-style animated close */
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  /** Masonry-style: animate from direction. Default "bottom" */
  animateFrom?: "bottom" | "top" | "left" | "right" | "center";
  /** Masonry-style: blur to focus on open. Default true */
  blurToFocus?: boolean;
  duration?: number;
  ease?: string;
}

/**
 * Modal wrapper that uses Masonry-style GSAP animations for summoning and closing.
 * Only the modal container is animated—content is passed as children unchanged.
 */
export function MasonryModal({
  isOpen,
  onClose,
  children,
  animateFrom = "bottom",
  blurToFocus = true,
  duration = 0.6,
  ease = "power3.out",
}: MasonryModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overlayRef.current || !panelRef.current) return;
    if (isOpen) {
      const panel = panelRef.current;
      const panelRect = panel.getBoundingClientRect();

      let fromY: number;
      let fromX: number;
      switch (animateFrom) {
        case "top":
          fromY = -panelRect.height - 200;
          fromX = 0;
          break;
        case "bottom":
          fromY = window.innerHeight + 200;
          fromX = 0;
          break;
        case "left":
          fromY = 0;
          fromX = -panelRect.width - 200;
          break;
        case "right":
          fromY = 0;
          fromX = window.innerWidth + 200;
          break;
        case "center":
          fromY = window.innerHeight / 2 - panelRect.height / 2;
          fromX = window.innerWidth / 2 - panelRect.width / 2;
          break;
        default:
          fromY = window.innerHeight + 200;
          fromX = 0;
      }

      gsap.set(overlayRef.current, { display: "flex", opacity: 0 });
      gsap.set(panel, {
        opacity: 0,
        y: animateFrom === "left" || animateFrom === "right" ? 0 : fromY,
        x: animateFrom === "left" || animateFrom === "right" ? fromX : 0,
        ...(blurToFocus && { filter: "blur(10px)" }),
      });

      gsap.to(overlayRef.current, {
        opacity: 1,
        duration: duration * 0.5,
        ease,
      });
      gsap.to(panel, {
        opacity: 1,
        y: 0,
        x: 0,
        ...(blurToFocus && { filter: "blur(0px)" }),
        duration,
        ease,
      });
    } else {
      const panel = panelRef.current;
      let toY: number;
      let toX: number;
      switch (animateFrom) {
        case "top":
          toY = -window.innerHeight - 200;
          toX = 0;
          break;
        case "bottom":
          toY = window.innerHeight + 200;
          toX = 0;
          break;
        case "left":
          toY = 0;
          toX = -window.innerWidth - 200;
          break;
        case "right":
          toY = 0;
          toX = window.innerWidth + 200;
          break;
        case "center":
          toY = window.innerHeight / 2;
          toX = window.innerWidth / 2;
          break;
        default:
          toY = window.innerHeight + 200;
          toX = 0;
      }

      gsap.to(panel, {
        opacity: 0,
        y: animateFrom === "left" || animateFrom === "right" ? 0 : toY,
        x: animateFrom === "left" || animateFrom === "right" ? toX : 0,
        ...(blurToFocus && { filter: "blur(10px)" }),
        duration: duration * 0.6,
        ease: "power3.in",
      });
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: duration * 0.4,
        delay: duration * 0.2,
        ease: "power2.in",
      });
    }
  }, [isOpen, animateFrom, blurToFocus, duration, ease]);

  const handleClose = () => {
    if (!panelRef.current || !overlayRef.current) {
      onClose();
      return;
    }
    const panel = panelRef.current;
    const toY =
      animateFrom === "top"
        ? -window.innerHeight - 200
        : window.innerHeight + 200;
    const toX =
      animateFrom === "left"
        ? -window.innerWidth - 200
        : animateFrom === "right"
          ? window.innerWidth + 200
          : 0;

    gsap.to(panel, {
      opacity: 0,
      y: animateFrom === "left" || animateFrom === "right" ? 0 : toY,
      x: animateFrom === "left" || animateFrom === "right" ? toX : 0,
      ...(blurToFocus && { filter: "blur(10px)" }),
      duration: 0.4,
      ease: "power3.in",
      onComplete: onClose,
    });
    gsap.to(overlayRef.current, {
      opacity: 0,
      duration: 0.25,
      delay: 0.1,
      ease: "power2.in",
    });
  };

  if (!isOpen) return null;

  const content = typeof children === "function" ? children(onClose) : children;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
      style={{ display: "none" }}
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
}
