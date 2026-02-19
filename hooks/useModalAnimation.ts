import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function useModalAnimation(isOpen: boolean, onClose?: () => void) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overlayRef.current || !panelRef.current) return;

    if (isOpen) {
      gsap.set(overlayRef.current, { display: "block", opacity: 0 });
      gsap.set(panelRef.current, { y: "100%", opacity: 0 });

      gsap.to(overlayRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
      });
      gsap.to(panelRef.current, {
        y: 0,
        opacity: 1,
        duration: 0.4,
        ease: "power3.out",
      });
    } else {
      gsap.to(panelRef.current, {
        y: "100%",
        opacity: 0,
        duration: 0.3,
        ease: "power3.in",
      });
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.25,
        delay: 0.15,
        ease: "power2.in",
      });
    }
  }, [isOpen]);

  const closeWithAnimation = () => {
    if (!panelRef.current || !overlayRef.current) return;
    gsap.to(panelRef.current, {
      y: "100%",
      opacity: 0,
      duration: 0.3,
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

  return { overlayRef, panelRef, closeWithAnimation };
}
