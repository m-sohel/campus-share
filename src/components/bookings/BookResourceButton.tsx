"use client";

import React, { useState } from "react";
import { Resource } from "@/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { BookingRequestModal } from "./BookingRequestModal";

interface BookResourceButtonProps {
  resource: Resource;
  isEligible: boolean;
}

export function BookResourceButton({ resource, isEligible }: BookResourceButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        disabled={!isEligible}
        onClick={() => setIsOpen(true)}
        className={
          isEligible
            ? "bg-indigo-600 hover:bg-indigo-500 text-white text-xs w-full sm:w-auto"
            : "bg-slate-200 text-slate-400 text-xs w-full sm:w-auto cursor-not-allowed"
        }
      >
        <Calendar className="w-3.5 h-3.5 mr-1.5" />
        {isEligible ? "Request Slot" : "Prerequisites Required"}
      </Button>

      {isOpen && (
        <BookingRequestModal
          resource={resource}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
