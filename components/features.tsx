"use client";

import React from "react";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import { cn } from "@/lib/utils";
import { GridLineHorizontal, GridLineVertical } from "./grid-lines";
import { SkeletonOne } from "./skeletons/first";
import { SkeletonTwo } from "./skeletons/second";
import { SkeletonFour } from "./skeletons/fourth";
import { SkeletonThree } from "./skeletons/third";
import { useTranslations } from 'next-intl';

export const Features = () => {
  const t = useTranslations('features');
  const features = [
    {
      title: t('items.aiOptimized.title'),
      description: t('items.aiOptimized.description'),
      skeleton: <SkeletonOne />,
      className:
        "col-span-1 md:col-span-4 border-b border-r border-border",
    },
    {
      title: t('items.zeroPipeline.title'),
      description: t('items.zeroPipeline.description'),
      skeleton: <SkeletonTwo />,
      className: "border-b col-span-1 md:col-span-2 border-border",
    },
    {
      title: t('items.nonTechnical.title'),
      description: t('items.nonTechnical.description'),
      skeleton: <SkeletonThree />,
      className: "col-span-1 md:col-span-3 border-r border-border",
    },
    {
      title: t('items.productionGrade.title'),
      description: t('items.productionGrade.description'),
      skeleton: <SkeletonFour />,
      className: "col-span-1 md:col-span-3",
    },
  ];
  return (
    <div className="relative z-20 py-10 md:py-40">
      <Heading as="h2">{t('title')}</Heading>
      <Subheading className="text-center ">
        {t('subtitle')}
      </Subheading>

      <div className="relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-6 mt-12">
          {features.map((feature) => (
            <FeatureCard key={feature.title} className={feature.className}>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
              <div className=" h-full w-full">{feature.skeleton}</div>
            </FeatureCard>
          ))}
        </div>
        <GridLineHorizontal
          style={{
            top: 0,
            left: "-10%",
            width: "120%",
          }}
        />

        <GridLineHorizontal
          style={{
            bottom: 0,
            left: "-10%",
            width: "120%",
          }}
        />

        <GridLineVertical
          style={{
            top: "-10%",
            right: 0,
            height: "120%",
          }}
        />
        <GridLineVertical
          style={{
            top: "-10%",
            left: 0,
            height: "120%",
          }}
        />
      </div>
    </div>
  );
};

const FeatureCard = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn(`p-4 sm:p-8 relative overflow-hidden`, className)}>
      {children}
    </div>
  );
};

const FeatureTitle = ({ children }: { children?: React.ReactNode }) => {
  return (
    <Heading as="h3" size="sm" className="text-left">
      {children}
    </Heading>
  );
};

const FeatureDescription = ({ children }: { children?: React.ReactNode }) => {
  return (
    <Subheading className="text-left max-w-sm mx-0 md:text-sm my-2">
      {children}
    </Subheading>
  );
};
