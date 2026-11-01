import React from 'react';

interface BaadreEmblemLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'splash';
  animateGear?: boolean;
  className?: string;
}

export const BaadreEmblemLogo: React.FC<BaadreEmblemLogoProps> = ({
  size = 'splash',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-8 h-8 sm:w-9 sm:h-9',
    md: 'w-12 h-12 sm:w-14 sm:h-14',
    lg: 'w-20 h-20 sm:w-24 sm:h-24',
    xl: 'w-32 h-32 sm:w-36 sm:h-36',
    splash: 'w-56 sm:w-64 h-auto',
  };

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <img
        src="/assets/aistudio/cave_baadre_logo.png"
        alt="ÇAVÊ BAADRÊ Logo"
        className={`${sizeMap[size]} object-contain select-none pointer-events-none`}
        loading="eager"
      />
    </div>
  );
};
