import React from 'react';
import { CheckCircle2, Clock, Package, Truck, Check } from 'lucide-react';
import { cn } from '../utils/cn';

type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';

interface OrderStatusTrackerProps {
  status: OrderStatus;
}

const steps: { status: OrderStatus; label: string; icon: any }[] = [
  { status: 'pending', label: 'Ordered', icon: Clock },
  { status: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { status: 'ready', label: 'Ready', icon: Package },
  { status: 'completed', label: 'Picked Up', icon: Check },
];

export const OrderStatusTracker = ({ status }: OrderStatusTrackerProps) => {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-red-500 bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">
        <XCircle className="w-4 h-4" />
        Order Cancelled
      </div>
    );
  }

  const currentStepIndex = steps.findIndex(s => s.status === status);

  return (
    <div className="w-full py-4">
      <div className="relative flex justify-between">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0" />
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-500" 
          style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const Icon = step.icon;

          return (
            <div key={step.status} className="relative z-10 flex flex-col items-center gap-2">
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "bg-white text-gray-300 border-2 border-gray-100"
                )}
              >
                <Icon className={cn("w-4 h-4", isCurrent && "animate-pulse")} />
              </div>
              <span 
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                  isCompleted ? "text-emerald-700" : "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import { XCircle } from 'lucide-react';
