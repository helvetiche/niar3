"use client";

import { ReactNode, useState } from "react";
import { CheckIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

interface StepConfig {
  title: string;
  description?: string;
  content: ReactNode;
}

interface WorkspaceStepperProps {
  steps: StepConfig[];
  onComplete?: () => void;
  onStepChange?: (step: number) => void;
  canProceed?: (currentStep: number) => boolean;
  completeButtonText?: string;
  nextButtonText?: string;
  backButtonText?: string;
}

export function WorkspaceStepper({
  steps,
  onComplete,
  onStepChange,
  canProceed,
  completeButtonText = "Complete",
  nextButtonText = "Continue",
  backButtonText = "Back",
}: WorkspaceStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      onStepChange?.(nextStep);
    } else {
      onComplete?.();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      onStepChange?.(prevStep);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
      onStepChange?.(stepIndex);
    }
  };

  const isLastStep = currentStep === steps.length - 1;
  const canGoNext = canProceed ? canProceed(currentStep) : true;

  return (
    <div className="flex flex-col gap-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const isClickable = index <= currentStep;

          return (
            <div key={index} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => handleStepClick(index)}
                disabled={!isClickable}
                className={`group flex items-center gap-3 transition ${
                  isClickable ? "cursor-pointer" : "cursor-not-allowed"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-semibold transition ${
                    isCompleted
                      ? "border-white bg-white text-emerald-900"
                      : isActive
                        ? "border-white bg-emerald-700 text-white"
                        : "border-white/40 bg-white/10 text-white/60"
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon size={20} weight="bold" />
                  ) : (
                    <span className="text-sm">{index + 1}</span>
                  )}
                </div>
                <div className="hidden flex-col items-start lg:flex">
                  <span
                    className={`text-sm font-medium ${
                      isActive || isCompleted ? "text-white" : "text-white/60"
                    }`}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-xs text-white/50">
                      {step.description}
                    </span>
                  )}
                </div>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition ${
                    isCompleted ? "bg-white" : "bg-white/20"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-white/35 bg-white/10 p-6">
        {steps[currentStep].content}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CaretLeftIcon size={16} weight="bold" />
          {backButtonText}
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/80"
        >
          {isLastStep ? completeButtonText : nextButtonText}
          {!isLastStep && <CaretRightIcon size={16} weight="bold" />}
        </button>
      </div>
    </div>
  );
}
