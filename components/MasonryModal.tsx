"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";

const handleKeyDown = (
  event: KeyboardEvent,
  isOpen: boolean,
  handleClose: () => void,
) => {
  if (!isOpen || event.key !== "Escape") return;
  event.preventDefault();
  handleClose();
};

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
  /** Extra classes for the inner panel (e.g. max-w-2xl). Default: max-w-sm */
  panelClassName?: string;
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
  panelClassName = "max-w-sm",
}: MasonryModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
          fromY = 0;
          fromX = 0;
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
        ...(animateFrom === "center" && { scale: 0.96 }),
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
        ...(animateFrom === "center" && { scale: 1 }),
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
          toY = 0;
          toX = 0;
          break;
        default:
          toY = window.innerHeight + 200;
          toX = 0;
      }

      gsap.to(panel, {
        opacity: 0,
        y: animateFrom === "left" || animateFrom === "right" ? 0 : toY,
        x: animateFrom === "left" || animateFrom === "right" ? toX : 0,
        ...(animateFrom === "center" && { scale: 0.96 }),
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

    if (animateFrom === "center") {
      gsap.to(panel, {
        opacity: 0,
        scale: 0.96,
        duration: 0.25,
        ease: "power2.in",
        onComplete: onClose,
      });
    } else {
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
    }
    gsap.to(overlayRef.current, {
      opacity: 0,
      duration: 0.25,
      delay: 0.1,
      ease: "power2.in",
    });
  };

  useEffect(() => {
    const bound = (e: KeyboardEvent) => handleKeyDown(e, isOpen, handleClose);
    window.addEventListener("keydown", bound);
    return () => window.removeEventListener("keydown", bound);
  }, [isOpen, handleClose]);

  if (!isOpen || !isMounted) return null;

  const content =
    typeof children === "function" ? children(handleClose) : children;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-emerald-900/90 backdrop-blur-sm p-4"
      onClick={handleClose}
      style={{ display: "none" }}
    >
      <div
        ref={panelRef}
        className={`relative w-full ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>,
    document.body,
  );
}
